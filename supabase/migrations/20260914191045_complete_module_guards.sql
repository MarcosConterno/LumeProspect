create or replace function private.platform_manage(operation text,target uuid,payload jsonb) returns jsonb
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
  if not exists(select 1 from public.workspaces where id=target and version=(payload->>'version')::integer) then raise exception 'Concurrent edit' using errcode='40001'; end if;
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

-- Preserve restrictive module authorization on legacy prospect children and Storage.
do $$ declare t text; op text; command text; begin
 foreach t in array array['prospect_contacts','prospect_score_axes','prospect_favorites'] loop
  foreach op in array array['read','create','update','delete'] loop
   command:=case op when 'read' then 'select' when 'create' then 'insert' when 'update' then 'update' else 'delete' end;
   execute format('create policy module_%s on public.%I as restrictive for %s to authenticated %s',
     op,t,command,case when op='create' then
     format('with check(exists(select 1 from public.prospects p where p.id=prospect_id and private.module_access(p.workspace_id,''prospeccao'',%L)))',op)
     when op='update' then
     format('using(exists(select 1 from public.prospects p where p.id=prospect_id and private.module_access(p.workspace_id,''prospeccao'',%L))) with check(exists(select 1 from public.prospects p where p.id=prospect_id and private.module_access(p.workspace_id,''prospeccao'',%L)))',op,op)
     else format('using(exists(select 1 from public.prospects p where p.id=prospect_id and private.module_access(p.workspace_id,''prospeccao'',%L)))',op) end);
  end loop;
 end loop;
end $$;
create policy crm_module_read on storage.objects as restrictive for select to authenticated
 using(bucket_id<>'crm-files' or exists(select 1 from public.deal_files f where f.storage_path=name and private.module_access(f.workspace_id,'crm','read')));
create policy crm_module_create on storage.objects as restrictive for insert to authenticated
 with check(bucket_id<>'crm-files' or exists(select 1 from public.deal_files f where f.storage_path=name and private.module_access(f.workspace_id,'crm','create')));
create policy crm_module_delete on storage.objects as restrictive for delete to authenticated
 using(bucket_id<>'crm-files' or exists(select 1 from public.deal_files f where f.storage_path=name and private.module_access(f.workspace_id,'crm','delete')));
comment on table private.platform_admins is 'Lume masters. Access only through guarded RPCs; membership in customer workspaces is unnecessary.';

