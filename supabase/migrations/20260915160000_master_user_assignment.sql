-- NOVA migration. Executar uma vez sobre a administração Lume existente.
-- Não cria contas em auth.users: a criação utiliza a API Auth Admin no servidor.
begin;
create function private.platform_assign_user(target uuid,address text,member_role text,check_only boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare person uuid; confirmed timestamptz; existing public.workspace_members; normalized text:=lower(trim(address));
begin
 if auth.uid() is null or not private.is_lume_master() then raise exception 'Master required' using errcode='42501'; end if;
 if normalized is null or length(normalized)>254 or normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or member_role is null or member_role not in ('admin','member') or check_only is null then
  raise exception 'Invalid account fields' using errcode='23514';
 end if;
 perform 1 from public.workspaces where id=target and status='active' for share;
 if not found then raise exception 'Active company required' using errcode='23514'; end if;
 -- Same user lock as invitation acceptance: serialize assignments across companies.
 select id,email_confirmed_at into person,confirmed from auth.users where lower(email)=normalized for update;
 if not found then
  if check_only then return jsonb_build_object('userId',null,'assigned',false); end if;
  raise exception 'Account not found' using errcode='23514';
 end if;
 if exists(select 1 from private.platform_admins where user_id=person) then raise exception 'Protected master account' using errcode='42501'; end if;
 select * into existing from public.workspace_members where user_id=person for update;
 if found and existing.workspace_id<>target then raise exception 'Account already belongs to another company' using errcode='23514'; end if;
 if check_only then return jsonb_build_object('userId',person,'assigned',existing.user_id is not null,'confirmed',confirmed is not null); end if;
 if confirmed is null then raise exception 'Account email not confirmed' using errcode='23514'; end if;
 if existing.user_id is not null then
  -- Retry is harmless; assignment never changes existing roles or reactivates users.
  return jsonb_build_object('userId',person,'assigned',true,'alreadyAssigned',true);
 end if;
 insert into public.profiles(id,full_name)
 select id,left(raw_user_meta_data->>'full_name',120) from auth.users where id=person on conflict do nothing;
 insert into public.workspace_members(workspace_id,user_id,role,active) values(target,person,member_role,true);
 insert into public.admin_audit(workspace_id,actor_id,event,details)
 values(target,auth.uid(),'user.assigned_by_master',jsonb_build_object('user_id',person,'role',member_role));
 return jsonb_build_object('userId',person,'assigned',true,'alreadyAssigned',false);
end $$;
create function public.platform_assign_user(target uuid,address text,member_role text,check_only boolean default false)
returns jsonb language sql security invoker set search_path='' as $$
 select private.platform_assign_user(target,address,member_role,check_only)
$$;
revoke all on function private.platform_assign_user(uuid,text,text,boolean),public.platform_assign_user(uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function private.platform_assign_user(uuid,text,text,boolean),public.platform_assign_user(uuid,text,text,boolean) to authenticated;
commit;
