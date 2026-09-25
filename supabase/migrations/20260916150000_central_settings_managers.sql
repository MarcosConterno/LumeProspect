-- NOVA / PENDENTE. Após 20260916120000_direct_user_management.sql e base financeira.
-- Não reaplicar migrations anteriores. Papéis existentes são preservados.
begin;
alter table public.workspace_members drop constraint workspace_members_role_check;
alter table public.workspace_members add constraint workspace_members_role_check
 check(role in ('owner','admin','manager','member'));

-- Gerentes consultam permissões próprias e de usuários comuns da própria empresa.
alter policy permissions_read on public.member_permissions to authenticated using (
 private.workspace_role(workspace_id) in ('owner','admin')
 or (user_id=auth.uid() and private.workspace_role(workspace_id) is not null)
 or (private.workspace_role(workspace_id)='manager' and exists(
  select 1 from public.workspace_members m where m.workspace_id=member_permissions.workspace_id
   and m.user_id=member_permissions.user_id and m.role='member'
 ))
);

create or replace function private.assign_managed_user(target uuid,address text,member_role text,check_only boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 person uuid; confirmed timestamptz; existing public.workspace_members;
 normalized text:=lower(trim(address)); actor_master boolean; home boolean; actor_role text;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 -- Serializa concessões master com a revogação existente.
 perform pg_advisory_xact_lock(740019);
 actor_master:=private.is_lume_master();
 actor_role:=private.workspace_role(target);
 if not actor_master and coalesce(private.workspace_role(target),'') not in ('owner','admin','manager') then
  raise exception 'Admin required' using errcode='42501';
 end if;
 if member_role='master' and not actor_master then raise exception 'Master required' using errcode='42501'; end if;
 if normalized is null or length(normalized)>254 or normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or member_role is null or member_role not in ('admin','manager','member','master') or check_only is null then
  raise exception 'Invalid account fields' using errcode='23514';
 end if;
 select is_lume into home from public.workspaces where id=target and status='active' for update;
 if not found then raise exception 'Active company required' using errcode='23514'; end if;
 -- Revalida após o lock compartilhado com a gestão de membros e suspensão.
 if not actor_master and coalesce(private.workspace_role(target),'') not in ('owner','admin','manager') then
  raise exception 'Admin required' using errcode='42501';
 end if;
 actor_role:=private.workspace_role(target);
 if actor_role='manager' and member_role<>'member' then raise exception 'Manager may only manage members' using errcode='42501'; end if;
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
 if actor_role='manager' and existing.user_id is not null and existing.role<>'member' then raise exception 'Protected account' using errcode='42501'; end if;
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
  if actor_role='manager' then
   update public.member_permissions p set
    can_read=private.module_access(target,p.module,'read'),
    can_create=private.module_access(target,p.module,'create'),
    can_update=private.module_access(target,p.module,'update'),
    can_delete=private.module_access(target,p.module,'delete'),
    can_settle=p.module='financeiro' and private.module_access(target,p.module,'settle'),
    can_reverse=p.module='financeiro' and private.module_access(target,p.module,'reverse')
   where p.workspace_id=target and p.user_id=person;
  end if;
  insert into public.admin_audit(workspace_id,actor_id,event,details)
   values(target,auth.uid(),'user.assigned_directly',jsonb_build_object('user_id',person,'role',member_role));
 end if;
 return jsonb_build_object('userId',person,'assigned',true,'alreadyAssigned',false);
end $$;

create or replace function private.manage_member(target uuid, person uuid, member_role text, enabled boolean, permissions jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare item jsonb; existing public.workspace_members; actor_role text; right_name text;
begin
 if auth.uid() is null or coalesce(private.workspace_role(target),'') not in ('owner','admin','manager') then raise exception 'Admin required' using errcode='42501'; end if;
 perform 1 from public.workspaces where id=target for update;
 actor_role:=private.workspace_role(target);
 if coalesce(actor_role,'') not in ('owner','admin','manager') then raise exception 'Admin or manager required' using errcode='42501'; end if;
 select * into existing from public.workspace_members where workspace_id=target and user_id=person for update;
 if not found or person=auth.uid() or existing.role='owner' or exists(select 1 from private.platform_admins where user_id=person) then raise exception 'Protected account' using errcode='42501'; end if;
 if actor_role='manager' and (existing.role<>'member' or member_role is distinct from 'member') then raise exception 'Manager may only manage members' using errcode='42501'; end if;
 if member_role is null or member_role not in ('admin','manager','member') or enabled is null or permissions is null or jsonb_typeof(permissions)<>'array' then raise exception 'Invalid permissions' using errcode='23514'; end if;
 if existing.active and existing.role='admin' and (not enabled or member_role<>'admin') and not exists(select 1 from public.workspace_members where workspace_id=target and user_id<>person and active and role in ('owner','admin')) then
  raise exception 'Cannot remove last company administrator' using errcode='23514'; end if;
 update public.workspace_members set role=member_role,active=enabled where workspace_id=target and user_id=person;
 for item in select * from jsonb_array_elements(permissions) loop
  if actor_role='manager' then
   foreach right_name in array array['read','create','update','delete','settle','reverse'] loop
    if coalesce((item->>right_name)::boolean,false) and not private.module_access(target,item->>'module',right_name) then
     raise exception 'Cannot delegate unavailable permission' using errcode='42501';
    end if;
   end loop;
  end if;
  insert into public.member_permissions(workspace_id,user_id,module,can_read,can_create,can_update,can_delete,can_settle,can_reverse)
  values(target,person,item->>'module',(item->>'read')::boolean,(item->>'create')::boolean,(item->>'update')::boolean,(item->>'delete')::boolean,
   case when item->>'module'='financeiro' then coalesce((item->>'settle')::boolean,false) else false end,
   case when item->>'module'='financeiro' then coalesce((item->>'reverse')::boolean,false) else false end)
  on conflict(workspace_id,user_id,module) do update set can_read=excluded.can_read,can_create=excluded.can_create,can_update=excluded.can_update,can_delete=excluded.can_delete,can_settle=excluded.can_settle,can_reverse=excluded.can_reverse;
 end loop;
 -- Não contornar o limite reativando usuário com direitos maiores e omitindo a lista.
 if actor_role='manager' and enabled and exists(
  select 1 from public.member_permissions p
  join public.workspace_modules m on m.workspace_id=p.workspace_id and m.module=p.module and m.enabled
  where p.workspace_id=target and p.user_id=person and p.can_read and (
   not private.module_access(target,p.module,'read')
   or (p.can_create and not private.module_access(target,p.module,'create'))
   or (p.can_update and not private.module_access(target,p.module,'update'))
   or (p.can_delete and not private.module_access(target,p.module,'delete'))
   or (p.module='financeiro' and p.can_settle and not private.module_access(target,p.module,'settle'))
   or (p.module='financeiro' and p.can_reverse and not private.module_access(target,p.module,'reverse'))
  )
 ) then raise exception 'Cannot delegate unavailable permission' using errcode='42501'; end if;
end $$;


commit;
