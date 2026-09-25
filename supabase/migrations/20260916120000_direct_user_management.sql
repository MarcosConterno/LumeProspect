-- PENDENTE: executar uma vez, após a base administrativa existente.
-- Contas são criadas pela API Auth Admin no servidor, nunca por INSERT nesta migration.
begin;

create function private.assign_managed_user(target uuid,address text,member_role text,check_only boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 person uuid; confirmed timestamptz; existing public.workspace_members;
 normalized text:=lower(trim(address)); actor_master boolean; home boolean;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 -- Serializa concessões master com a revogação existente.
 perform pg_advisory_xact_lock(740019);
 actor_master:=private.is_lume_master();
 if not actor_master and coalesce(private.workspace_role(target),'') not in ('owner','admin') then
  raise exception 'Admin required' using errcode='42501';
 end if;
 if member_role='master' and not actor_master then raise exception 'Master required' using errcode='42501'; end if;
 if normalized is null or length(normalized)>254 or normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or member_role is null or member_role not in ('admin','member','master') or check_only is null then
  raise exception 'Invalid account fields' using errcode='23514';
 end if;
 select is_lume into home from public.workspaces where id=target and status='active' for update;
 if not found then raise exception 'Active company required' using errcode='23514'; end if;
 -- Revalida após o lock compartilhado com a gestão de membros e suspensão.
 if not actor_master and coalesce(private.workspace_role(target),'') not in ('owner','admin') then
  raise exception 'Admin required' using errcode='42501';
 end if;
 if member_role='master' and not home then raise exception 'Master requires Lume workspace' using errcode='42501'; end if;
 select id,email_confirmed_at into person,confirmed from auth.users where lower(email)=normalized for update;
 if not found then
  if check_only then return jsonb_build_object('userId',null,'assigned',false); end if;
  raise exception 'Account not found' using errcode='23514';
 end if;
 if member_role<>'master' and exists(select 1 from private.platform_admins where user_id=person) then
  raise exception 'Protected master account' using errcode='42501';
 end if;
 select * into existing from public.workspace_members where user_id=person for update;
 if found and existing.workspace_id<>target then raise exception 'Account already belongs to another company' using errcode='23514'; end if;
 if check_only then return jsonb_build_object('userId',person,'assigned',existing.user_id is not null,'confirmed',confirmed is not null); end if;
 if confirmed is null then raise exception 'Account email not confirmed' using errcode='23514'; end if;
 if member_role='master' then
  if exists(select 1 from private.platform_admins where user_id=person) then
   return jsonb_build_object('userId',person,'assigned',true,'alreadyAssigned',true);
  end if;
  insert into public.profiles(id,full_name)
   select id,left(raw_user_meta_data->>'full_name',120) from auth.users where id=person on conflict do nothing;
  insert into public.workspace_members(workspace_id,user_id,role,active) values(target,person,'admin',true)
   on conflict(user_id) do update set active=true;
  insert into private.platform_admins(user_id) values(person);
  insert into public.admin_audit(workspace_id,actor_id,event,details)
   values(target,auth.uid(),'master.granted',jsonb_build_object('user_id',person,'source','direct'));
 elsif existing.user_id is not null then
  -- Repetir cadastro não muda papel, permissões nem reativa vínculo.
  return jsonb_build_object('userId',person,'assigned',true,'alreadyAssigned',true);
 else
  insert into public.profiles(id,full_name)
   select id,left(raw_user_meta_data->>'full_name',120) from auth.users where id=person on conflict do nothing;
  insert into public.workspace_members(workspace_id,user_id,role,active) values(target,person,member_role,true);
  insert into public.admin_audit(workspace_id,actor_id,event,details)
   values(target,auth.uid(),'user.assigned_directly',jsonb_build_object('user_id',person,'role',member_role));
 end if;
 return jsonb_build_object('userId',person,'assigned',true,'alreadyAssigned',false);
end $$;

create function public.assign_managed_user(target uuid,address text,member_role text,check_only boolean default false)
returns jsonb language sql security invoker set search_path='' as $$
 select private.assign_managed_user(target,address,member_role,check_only)
$$;
revoke all on function private.assign_managed_user(uuid,text,text,boolean),public.assign_managed_user(uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function private.assign_managed_user(uuid,text,text,boolean),public.assign_managed_user(uuid,text,text,boolean) to authenticated;

-- Bloqueia links antigos e chamadas legadas. Mantém registros para histórico.
create or replace function private.create_workspace_invite(target uuid,invite_email text,invite_role text,token text)
returns uuid language plpgsql security definer set search_path='' as $$
begin raise exception 'Invitations disabled; use direct user management' using errcode='42501'; end $$;
create or replace function private.accept_workspace_invite(token text)
returns uuid language plpgsql security definer set search_path='' as $$
begin raise exception 'Invitations disabled; use direct user management' using errcode='42501'; end $$;
revoke all on function private.create_workspace_invite(uuid,text,text,text),public.create_workspace_invite(uuid,text,text,text),
 private.accept_workspace_invite(text),public.accept_workspace_invite(text) from public,anon,authenticated;

-- Também fecha a operação invite_master do endpoint administrativo antigo.
create function private.reject_new_invitation() returns trigger
language plpgsql set search_path='' as $$
begin raise exception 'Invitations disabled; use direct user management' using errcode='42501'; end $$;
revoke all on function private.reject_new_invitation() from public,anon,authenticated;
create trigger reject_new_invitation before insert on public.workspace_invites
 for each row execute function private.reject_new_invitation();
commit;
