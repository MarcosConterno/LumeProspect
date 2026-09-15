
-- Lume control plane. Existing account is bootstrapped by confirmed email once;
-- subsequent authorization always uses the protected user id registry.
alter table public.workspaces add column is_lume boolean not null default false;
create unique index one_lume_workspace on public.workspaces(is_lume) where is_lume;
alter table public.workspaces alter column owner_id drop not null;
alter table public.workspace_members add column active boolean not null default true;
alter table public.workspace_members add constraint one_workspace_per_user unique(user_id);
do $$ declare actor uuid; home uuid; begin
 select id into strict actor from auth.users where lower(email)='markos.souza5@gmail.com' and email_confirmed_at is not null;
 select workspace_id into strict home from public.workspace_members where user_id=actor;
 update public.workspaces set is_lume=true where id=home;
 insert into private.platform_admins(user_id) values(actor) on conflict do nothing;
end $$;

create function private.is_lume_master() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from private.platform_admins where user_id=auth.uid())
$$;
create function public.is_lume_master() returns boolean language sql stable security invoker set search_path='' as $$ select private.is_lume_master() $$;
revoke all on function private.is_lume_master(),public.is_lume_master() from public,anon;
grant execute on function private.is_lume_master(),public.is_lume_master() to authenticated;

create or replace function private.workspace_role(target uuid) returns text
language sql stable security definer set search_path='' as $$
 select case when private.is_lume_master() then 'owner'
 else (select m.role from public.workspace_members m where m.workspace_id=w.id and m.user_id=auth.uid() and m.active) end
 from public.workspaces w where w.id=target and auth.uid() is not null and (w.status='active' or private.is_lume_master())
$$;

create table public.workspace_modules(
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 module text not null check(module in ('crm','financeiro','agenda','prospeccao')),
 enabled boolean not null default false,
 primary key(workspace_id,module)
);
create table public.member_permissions(
 workspace_id uuid not null,
 user_id uuid not null,
 module text not null check(module in ('crm','financeiro','agenda','prospeccao')),
 can_read boolean not null default true,
 can_create boolean not null default true,
 can_update boolean not null default true,
 can_delete boolean not null default false,
 primary key(workspace_id,user_id,module),
 foreign key(workspace_id,user_id) references public.workspace_members(workspace_id,user_id) on delete cascade,
 check(can_read or not(can_create or can_update or can_delete))
);
create index member_permissions_user_idx on public.member_permissions(user_id);
create table public.admin_audit(
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid references public.workspaces(id) on delete set null,
 actor_id uuid references public.profiles(id) on delete set null,
 event text not null,
 details jsonb not null default '{}',
 created_at timestamptz not null default now()
);
create index admin_audit_workspace_time_idx on public.admin_audit(workspace_id,created_at desc,id);
create index admin_audit_actor_idx on public.admin_audit(actor_id);
alter table public.workspace_modules enable row level security;
alter table public.member_permissions enable row level security;
alter table public.admin_audit enable row level security;
revoke all on public.workspace_modules,public.member_permissions,public.admin_audit from public,anon,authenticated;
grant select on public.workspace_modules,public.member_permissions,public.admin_audit to authenticated;
create policy modules_read on public.workspace_modules for select to authenticated using(private.workspace_role(workspace_id) is not null);
create policy permissions_read on public.member_permissions for select to authenticated using(private.workspace_role(workspace_id) in ('owner','admin') or (user_id=auth.uid() and private.workspace_role(workspace_id) is not null));
create policy audit_read on public.admin_audit for select to authenticated using(private.is_lume_master() or private.workspace_role(workspace_id) in ('owner','admin'));

create function private.module_access(target uuid, product text, operation text) returns boolean
language sql stable security definer set search_path='' as $$
 select case when private.is_lume_master() then exists(select 1 from public.workspaces where id=target)
 when private.workspace_role(target) is null then false
 when not exists(select 1 from public.workspace_modules where workspace_id=target and module=product and enabled) then false
 when private.workspace_role(target) in ('owner','admin') then true
 else coalesce((select case operation when 'read' then can_read when 'create' then can_create when 'update' then can_update when 'delete' then can_delete else false end
 from public.member_permissions where workspace_id=target and user_id=auth.uid() and module=product),false) end
$$;
create function public.module_access(target uuid, product text, operation text) returns boolean
language sql stable security invoker set search_path='' as $$ select private.module_access(target,product,operation) $$;
revoke all on function private.module_access(uuid,text,text),public.module_access(uuid,text,text) from public,anon;
grant execute on function private.module_access(uuid,text,text),public.module_access(uuid,text,text) to authenticated;

-- New companies are provisioned only through the master RPC.
revoke insert(name,owner_id) on public.workspaces from authenticated;
revoke insert on public.workspace_members from authenticated;
revoke execute on function private.create_workspace(text),public.create_workspace(text) from authenticated;
create or replace function private.create_workspace(company_name text) returns uuid language plpgsql security definer set search_path='' as $$
begin raise exception 'Use Lume administration' using errcode='42501'; end $$;
create or replace function private.add_workspace_owner() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.owner_id is not null then
  if not private.is_lume_master() then raise exception 'Master required' using errcode='42501'; end if;
  insert into public.workspace_members(workspace_id,user_id,role) values(new.id,new.owner_id,'owner');
 end if;
 insert into public.workspace_modules(workspace_id,module,enabled) select new.id,m,false from unnest(array['crm','financeiro','agenda','prospeccao']) m;
 return new;
end $$;
insert into public.workspace_modules(workspace_id,module,enabled)
 select w.id,m,w.is_lume from public.workspaces w cross join unnest(array['crm','financeiro','agenda','prospeccao']) m;
create function private.member_defaults() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.member_permissions(workspace_id,user_id,module)
 select new.workspace_id,new.user_id,m from unnest(array['crm','financeiro','agenda','prospeccao']) m;
 return new;
end $$;
revoke all on function private.member_defaults() from public,anon,authenticated;
create trigger member_defaults after insert on public.workspace_members for each row execute function private.member_defaults();
insert into public.member_permissions(workspace_id,user_id,module)
 select w.workspace_id,w.user_id,m from public.workspace_members w cross join unnest(array['crm','financeiro','agenda','prospeccao']) m;

-- Administrative mutations are audited without invitation token hashes.
create function private.audit_administration() returns trigger language plpgsql security definer set search_path='' as $$
declare before_row jsonb; after_row jsonb; tenant uuid;
begin
 if tg_op<>'INSERT' then before_row:=to_jsonb(old)-'token_hash'; end if;
 if tg_op<>'DELETE' then after_row:=to_jsonb(new)-'token_hash'; end if;
 tenant:=case when tg_table_name='workspaces' then coalesce(after_row,before_row)->>'id'
 else coalesce(after_row,before_row)->>'workspace_id' end;
 insert into public.admin_audit(workspace_id,actor_id,event,details)
 values(tenant,auth.uid(),tg_table_name||'.'||lower(tg_op),jsonb_build_object('before',before_row,'after',after_row));
 return coalesce(new,old);
end $$;
revoke all on function private.audit_administration() from public,anon,authenticated;
do $$ declare t text; begin foreach t in array array['workspaces','workspace_members','workspace_modules','member_permissions','workspace_invites'] loop
 execute format('create trigger audit_administration after insert or update or delete on public.%I for each row execute function private.audit_administration()',t);
end loop; end $$;

-- Locking ensures concurrent removals cannot eliminate every master.
create function private.protect_master_registry() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(740019);
 if tg_op='DELETE' and (select count(*) from private.platform_admins)<=1 then
  raise exception 'Cannot remove last master' using errcode='23514';
 end if;
 if tg_op='UPDATE' then raise exception 'Master identity is immutable' using errcode='23514'; end if;
 return case when tg_op='DELETE' then old else new end;
end $$;
revoke all on function private.protect_master_registry() from public,anon,authenticated;
create trigger protect_master_registry before delete or update on private.platform_admins for each row execute function private.protect_master_registry();

-- Extend invitations with a master-only role. No token is exposed in table reads.
alter table public.workspace_invites drop constraint workspace_invites_role_check;
alter table public.workspace_invites add constraint workspace_invites_role_check check(role in ('admin','member','master'));
create or replace function private.create_workspace_invite(target uuid,invite_email text,invite_role text,token text) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid; actor_role text:=private.workspace_role(target);
begin
 if auth.uid() is null or actor_role not in ('owner','admin') or actor_role is null then raise exception 'Not authorized' using errcode='42501'; end if;
 if invite_role not in ('admin','member') or token !~ '^[a-f0-9]{64}$' or length(invite_email)>254 or invite_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
  raise exception 'Invalid invitation' using errcode='23514'; end if;
 if exists(select 1 from auth.users u join public.workspace_members m on m.user_id=u.id where lower(u.email)=lower(trim(invite_email)) and m.workspace_id<>target) then
  raise exception 'Account already belongs to another company' using errcode='23514'; end if;
 insert into public.workspace_invites(workspace_id,email,role,token_hash,created_by)
 values(target,lower(trim(invite_email)),invite_role,encode(sha256(convert_to(token,'UTF8')),'hex'),auth.uid()) returning id into result;
 return result;
end $$;
create or replace function private.accept_workspace_invite(token text) returns uuid language plpgsql security definer set search_path='' as $$
declare invitation public.workspace_invites; actor uuid:=auth.uid(); verified_email text; creator_role text;
begin
 if actor is null or token !~ '^[a-f0-9]{64}$' then raise exception 'Invalid invitation' using errcode='42501'; end if;
 -- Serialize concurrent acceptances of different invitations by the same person.
 perform 1 from auth.users where id=actor for update;
 select lower(email) into verified_email from auth.users where id=actor and email_confirmed_at is not null;
 select * into invitation from public.workspace_invites where token_hash=encode(sha256(convert_to(token,'UTF8')),'hex') for update;
 if not found or verified_email is null or invitation.email<>verified_email or invitation.revoked_at is not null or invitation.accepted_at is not null or invitation.expires_at<=now() then
  raise exception 'Invalid invitation' using errcode='42501'; end if;
 if not exists(select 1 from public.workspaces where id=invitation.workspace_id and status='active') then raise exception 'Company suspended' using errcode='42501'; end if;
 if exists(select 1 from public.workspace_members where user_id=actor and workspace_id<>invitation.workspace_id) then raise exception 'Account belongs to another company' using errcode='23514'; end if;
 if exists(select 1 from private.platform_admins where user_id=invitation.created_by) then creator_role:='master';
 else select role into creator_role from public.workspace_members where workspace_id=invitation.workspace_id and user_id=invitation.created_by and active for share; end if;
 if creator_role is null or creator_role not in ('master','owner','admin') or (invitation.role='master' and creator_role<>'master') then raise exception 'Invitation no longer authorized' using errcode='42501'; end if;
 insert into public.profiles(id,full_name) select id,left(raw_user_meta_data->>'full_name',120) from auth.users where id=actor on conflict do nothing;
 if invitation.role='master' then
  perform pg_advisory_xact_lock(740019);
  if not exists(select 1 from public.workspaces where id=invitation.workspace_id and is_lume) then raise exception 'Master requires Lume company' using errcode='23514'; end if;
  insert into private.platform_admins(user_id) values(actor) on conflict do nothing;
  insert into public.admin_audit(workspace_id,actor_id,event,details) values(invitation.workspace_id,actor,'master.granted',jsonb_build_object('user_id',actor,'invited_by',invitation.created_by));
 end if;
 insert into public.workspace_members(workspace_id,user_id,role)
 values(invitation.workspace_id,actor,case when invitation.role='master' then 'admin' else invitation.role end) on conflict(user_id) do nothing;
 update public.workspace_invites set accepted_at=now() where id=invitation.id;
 return invitation.workspace_id;
end $$;
create or replace function private.revoke_workspace_invite(invite_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare invitation public.workspace_invites;
begin
 select * into invitation from public.workspace_invites where id=invite_id for update;
 if auth.uid() is null or coalesce(private.workspace_role(invitation.workspace_id),'') not in ('owner','admin') or (invitation.role='master' and not private.is_lume_master()) then raise exception 'Not authorized' using errcode='42501'; end if;
 update public.workspace_invites set revoked_at=now() where id=invite_id and accepted_at is null;
end $$;

-- Tenant admin autonomy, while owners and master memberships stay protected.
revoke update(role),delete on public.workspace_members from authenticated;
create function private.manage_member(target uuid, person uuid, member_role text, enabled boolean, permissions jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare item jsonb; existing public.workspace_members;
begin
 if auth.uid() is null or coalesce(private.workspace_role(target),'') not in ('owner','admin') then raise exception 'Admin required' using errcode='42501'; end if;
 perform 1 from public.workspaces where id=target for update;
 select * into existing from public.workspace_members where workspace_id=target and user_id=person for update;
 if not found or person=auth.uid() or existing.role='owner' or exists(select 1 from private.platform_admins where user_id=person) then raise exception 'Protected account' using errcode='42501'; end if;
 if member_role not in ('admin','member') or enabled is null or jsonb_typeof(permissions)<>'array' then raise exception 'Invalid permissions' using errcode='23514'; end if;
 if existing.active and existing.role='admin' and (not enabled or member_role<>'admin') and not exists(select 1 from public.workspace_members where workspace_id=target and user_id<>person and active and role in ('owner','admin')) then
  raise exception 'Cannot remove last company administrator' using errcode='23514'; end if;
 update public.workspace_members set role=member_role,active=enabled where workspace_id=target and user_id=person;
 for item in select * from jsonb_array_elements(permissions) loop
  insert into public.member_permissions(workspace_id,user_id,module,can_read,can_create,can_update,can_delete)
  values(target,person,item->>'module',(item->>'read')::boolean,(item->>'create')::boolean,(item->>'update')::boolean,(item->>'delete')::boolean)
  on conflict(workspace_id,user_id,module) do update set can_read=excluded.can_read,can_create=excluded.can_create,can_update=excluded.can_update,can_delete=excluded.can_delete;
 end loop;
end $$;
create function public.manage_member(target uuid,person uuid,member_role text,enabled boolean,permissions jsonb) returns void
language sql security invoker set search_path='' as $$ select private.manage_member(target,person,member_role,enabled,permissions) $$;
revoke all on function private.manage_member(uuid,uuid,text,boolean,jsonb),public.manage_member(uuid,uuid,text,boolean,jsonb) from public,anon;
grant execute on function private.manage_member(uuid,uuid,text,boolean,jsonb),public.manage_member(uuid,uuid,text,boolean,jsonb) to authenticated;

-- One authenticated endpoint for the control plane; every operation rechecks master status.
create function private.platform_manage(operation text,target uuid,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result uuid; home uuid; product text; token text; address text;
begin
 if not private.is_lume_master() then raise exception 'Master required' using errcode='42501'; end if;
 select id into home from public.workspaces where is_lume;
 if operation='create_client' then
  if length(trim(coalesce(payload->>'name',''))) not between 2 and 160 then raise exception 'Invalid name' using errcode='23514'; end if;
  insert into public.workspaces(name,owner_id) values(trim(payload->>'name'),null) returning id into result;
  return jsonb_build_object('id',result);
 elsif operation='configure_client' then
  perform 1 from public.workspaces where id=target for update;
  if not found then raise exception 'Company not found' using errcode='23514'; end if;
  if exists(select 1 from public.workspaces where id=target and is_lume) and payload->>'status'<>'active' then raise exception 'Cannot suspend Lume' using errcode='23514'; end if;
  if length(trim(coalesce(payload->>'name',''))) not between 2 and 160 or payload->>'status' not in ('active','suspended') then raise exception 'Invalid settings' using errcode='23514'; end if;
  update public.workspaces set name=trim(payload->>'name'),status=payload->>'status' where id=target;
  foreach product in array array['crm','financeiro','agenda','prospeccao'] loop
   update public.workspace_modules set enabled=coalesce((payload->'modules'->>product)::boolean,false) where workspace_id=target and module=product;
  end loop;
 elsif operation='invite_master' then
  address:=lower(trim(payload->>'email')); token:=payload->>'token';
  if address is null or address !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(address)>254 or token is null or token !~ '^[a-f0-9]{64}$' then raise exception 'Invalid invitation' using errcode='23514'; end if;
  if exists(select 1 from auth.users u join public.workspace_members m on m.user_id=u.id where lower(u.email)=address and m.workspace_id<>home) then raise exception 'Account already belongs to customer' using errcode='23514'; end if;
  insert into public.workspace_invites(workspace_id,email,role,token_hash,created_by) values(home,address,'master',encode(sha256(convert_to(token,'UTF8')),'hex'),auth.uid());
 elsif operation='remove_master' then
  perform pg_advisory_xact_lock(740019);
  delete from private.platform_admins where user_id=target;
  if not found then raise exception 'Master not found' using errcode='23514'; end if;
  -- Revoke company access as well; preserve membership for historical FKs.
  update public.workspace_members set active=false where user_id=target;
  insert into public.admin_audit(workspace_id,actor_id,event,details) values(home,auth.uid(),'master.revoked',jsonb_build_object('user_id',target));
 elsif operation='enter_client' then
  if not exists(select 1 from public.workspaces where id=target) then raise exception 'Company not found' using errcode='23514'; end if;
  insert into public.admin_audit(workspace_id,actor_id,event) values(target,auth.uid(),'master.entered_workspace');
 else raise exception 'Invalid operation' using errcode='23514';
 end if;
 return jsonb_build_object('ok',true);
end $$;
create function public.platform_manage(operation text,target uuid,payload jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select private.platform_manage(operation,target,payload) $$;
revoke all on function private.platform_manage(text,uuid,jsonb),public.platform_manage(text,uuid,jsonb) from public,anon;
grant execute on function private.platform_manage(text,uuid,jsonb),public.platform_manage(text,uuid,jsonb) to authenticated;
create function private.list_masters() returns table(user_id uuid,email text,full_name text) language plpgsql stable security definer set search_path='' as $$
begin
 if not private.is_lume_master() then raise exception 'Master required' using errcode='42501'; end if;
 return query select a.user_id,u.email::text,p.full_name from private.platform_admins a join auth.users u on u.id=a.user_id left join public.profiles p on p.id=a.user_id order by a.created_at;
end $$;
create function public.list_masters() returns table(user_id uuid,email text,full_name text) language sql stable security invoker set search_path='' as $$ select * from private.list_masters() $$;
revoke all on function private.list_masters(),public.list_masters() from public,anon;
grant execute on function private.list_masters(),public.list_masters() to authenticated;

-- Restrictive policies compose with tenant/author rules; hiding menus is not authorization.
do $$ declare t text; product text; begin
 foreach t in array array['companies','contacts','services','deals','deal_activities','deal_history','deal_notes','deal_files','prospects'] loop
  product:=case when t='prospects' then 'prospeccao' else 'crm' end;
  execute format('create policy module_read on public.%I as restrictive for select to authenticated using(private.module_access(workspace_id,%L,''read''))',t,product);
  execute format('create policy module_create on public.%I as restrictive for insert to authenticated with check(private.module_access(workspace_id,%L,''create''))',t,product);
  execute format('create policy module_update on public.%I as restrictive for update to authenticated using(private.module_access(workspace_id,%L,''update'')) with check(private.module_access(workspace_id,%L,''update''))',t,product,product);
  execute format('create policy module_delete on public.%I as restrictive for delete to authenticated using(private.module_access(workspace_id,%L,''delete''))',t,product);
 end loop;
end $$;
-- Base CRUD removal rules now respect configured member delete permission.
do $$ declare t text; begin
 foreach t in array array['companies','contacts','services','deals','deal_activities'] loop
  execute format('create policy configured_delete on public.%I for delete to authenticated using(private.module_access(workspace_id,''crm'',''delete''))',t);
 end loop;
end $$;

