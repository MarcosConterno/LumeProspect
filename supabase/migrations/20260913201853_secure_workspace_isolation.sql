-- Empresa assinante = workspace; companies são empresas atendidas no CRM.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter table public.workspaces add column status text not null default 'active'
  check (status in ('active','suspended'));
create index workspace_members_user_workspace_idx on public.workspace_members(user_id, workspace_id);
create index workspaces_owner_id_idx on public.workspaces(owner_id);

create function private.workspace_role(target uuid) returns text
language sql stable security definer set search_path = ''
as $$
  select case when w.owner_id = (select auth.uid()) then 'owner'
    else (select m.role from public.workspace_members m
          where m.workspace_id = w.id and m.user_id = (select auth.uid())) end
  from public.workspaces w
  where w.id = target and w.status = 'active' and (select auth.uid()) is not null
$$;
revoke all on function private.workspace_role(uuid) from public, anon;
grant execute on function private.workspace_role(uuid) to authenticated;

-- Recreate policies explicitly: no inherited permissive policies remain.
do $$
declare p record;
begin
 for p in select tablename, policyname from pg_policies
   where schemaname='public' and tablename in
   ('profiles','workspaces','workspace_members','companies','contacts','prospects',
    'prospect_contacts','prospect_score_axes','prospect_favorites','deals')
 loop execute format('drop policy %I on public.%I',p.policyname,p.tablename); end loop;
end $$;
drop function public.is_workspace_member(uuid);

revoke all on public.profiles, public.workspaces, public.workspace_members,
 public.companies, public.contacts, public.prospects, public.prospect_contacts,
 public.prospect_score_axes, public.prospect_favorites, public.deals from anon, authenticated;

grant select, insert on public.profiles to authenticated;
grant update(full_name,avatar_url) on public.profiles to authenticated;
create policy profiles_read on public.profiles for select to authenticated using (id=(select auth.uid()));
create policy profiles_create on public.profiles for insert to authenticated with check (id=(select auth.uid()));
create policy profiles_edit on public.profiles for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));

grant select on public.workspaces to authenticated;
grant insert(name,owner_id) on public.workspaces to authenticated;
grant update(name) on public.workspaces to authenticated;
create policy workspaces_read on public.workspaces for select to authenticated using (private.workspace_role(id) is not null);
create policy workspaces_create on public.workspaces for insert to authenticated with check (owner_id=(select auth.uid()) and status='active');
create policy workspaces_edit on public.workspaces for update to authenticated
 using (private.workspace_role(id) in ('owner','admin')) with check (private.workspace_role(id) in ('owner','admin'));

grant select, insert, delete on public.workspace_members to authenticated;
grant update(role) on public.workspace_members to authenticated;
create policy members_read on public.workspace_members for select to authenticated using (private.workspace_role(workspace_id) is not null);
create policy members_create on public.workspace_members for insert to authenticated with check (
 (private.workspace_role(workspace_id)='owner' and (role in ('admin','member') or (role='owner' and user_id=(select auth.uid()))))
 or (private.workspace_role(workspace_id)='admin' and role='member')
);
create policy members_edit on public.workspace_members for update to authenticated
 using (private.workspace_role(workspace_id)='owner' and role<>'owner')
 with check (private.workspace_role(workspace_id)='owner' and role in ('admin','member'));
create policy members_remove on public.workspace_members for delete to authenticated using (
 (private.workspace_role(workspace_id)='owner' and role<>'owner')
 or (private.workspace_role(workspace_id)='admin' and role='member')
);

-- Composite foreign keys enforce tenant consistency even for privileged writes.
alter table public.companies add constraint companies_workspace_id_unique unique(workspace_id,id);
alter table public.prospects add constraint prospects_workspace_id_unique unique(workspace_id,id);
alter table public.deals add constraint deals_workspace_id_unique unique(workspace_id,id);
alter table public.prospects drop constraint prospects_company_id_fkey;
alter table public.prospects add constraint prospects_company_tenant_fk
 foreign key(workspace_id,company_id) references public.companies(workspace_id,id) on delete restrict;
alter table public.deals drop constraint deals_company_id_fkey;
alter table public.deals drop constraint deals_prospect_id_fkey;
alter table public.deals add constraint deals_company_tenant_fk
 foreign key(workspace_id,company_id) references public.companies(workspace_id,id) on delete restrict;
alter table public.deals add constraint deals_prospect_tenant_fk
 foreign key(workspace_id,prospect_id) references public.prospects(workspace_id,id) on delete restrict;
alter table public.contacts add column workspace_id uuid;
update public.contacts c set workspace_id=co.workspace_id from public.companies co where co.id=c.company_id;
alter table public.contacts alter column workspace_id set not null;
alter table public.contacts drop constraint contacts_company_id_fkey;
alter table public.contacts add constraint contacts_company_tenant_fk
 foreign key(workspace_id,company_id) references public.companies(workspace_id,id) on delete cascade;
create index contacts_workspace_company_idx on public.contacts(workspace_id,company_id);
create index deals_workspace_prospect_idx on public.deals(workspace_id,prospect_id);
create index deals_workspace_company_idx on public.deals(workspace_id,company_id);
create index prospects_workspace_company_idx on public.prospects(workspace_id,company_id);
create index deals_created_by_idx on public.deals(created_by);

create function private.prevent_tenant_move() returns trigger
language plpgsql set search_path = '' as $$
begin
 if new.workspace_id is distinct from old.workspace_id then
  raise exception 'Workspace cannot be changed' using errcode='23514';
 end if;
 new.updated_at=now();
 return new;
end $$;
revoke all on function private.prevent_tenant_move() from public,anon,authenticated;

do $$
declare t text;
begin
 foreach t in array array['companies','contacts','prospects','deals'] loop
  execute format('create trigger prevent_tenant_move before update on public.%I for each row execute function private.prevent_tenant_move()', t);
  execute format('grant select, insert, update, delete on public.%I to authenticated',t);
  execute format('create policy tenant_read on public.%I for select to authenticated using (private.workspace_role(workspace_id) is not null)',t);
  execute format('create policy tenant_create on public.%I for insert to authenticated with check (private.workspace_role(workspace_id) is not null)',t);
  execute format('create policy tenant_edit on public.%I for update to authenticated using (private.workspace_role(workspace_id) is not null) with check (private.workspace_role(workspace_id) is not null)',t);
  execute format('create policy tenant_remove on public.%I for delete to authenticated using (private.workspace_role(workspace_id) in (''owner'',''admin''))',t);
 end loop;
end $$;
-- Deal author is immutable and server-derived, not supplied by the browser.
create function private.deal_author() returns trigger
language plpgsql set search_path = '' as $$
begin
 if tg_op='INSERT' then new.created_by=auth.uid();
 else new.created_by=old.created_by; new.created_at=old.created_at; end if;
 return new;
end $$;
revoke all on function private.deal_author() from public,anon,authenticated;
create trigger deal_author before insert or update on public.deals for each row execute function private.deal_author();

-- Legacy prospect children inherit access from their parent.
do $$
declare t text;
begin
 foreach t in array array['prospect_contacts','prospect_score_axes'] loop
  execute format('grant select, insert, update, delete on public.%I to authenticated',t);
  execute format('create policy parent_read on public.%I for select to authenticated using (exists(select 1 from public.prospects p where p.id=prospect_id and private.workspace_role(p.workspace_id) is not null))',t);
  execute format('create policy parent_create on public.%I for insert to authenticated with check (exists(select 1 from public.prospects p where p.id=prospect_id and private.workspace_role(p.workspace_id) is not null))',t);
  execute format('create policy parent_edit on public.%I for update to authenticated using (exists(select 1 from public.prospects p where p.id=prospect_id and private.workspace_role(p.workspace_id) is not null)) with check (exists(select 1 from public.prospects p where p.id=prospect_id and private.workspace_role(p.workspace_id) is not null))',t);
  execute format('create policy parent_remove on public.%I for delete to authenticated using (exists(select 1 from public.prospects p where p.id=prospect_id and private.workspace_role(p.workspace_id) in (''owner'',''admin'')))',t);
 end loop;
end $$;
grant select,insert,delete on public.prospect_favorites to authenticated;
create policy favorites_read on public.prospect_favorites for select to authenticated using (
 user_id=(select auth.uid()) and exists(select 1 from public.prospects p where p.id=prospect_id));
create policy favorites_create on public.prospect_favorites for insert to authenticated with check (
 user_id=(select auth.uid()) and exists(select 1 from public.prospects p where p.id=prospect_id));
create policy favorites_remove on public.prospect_favorites for delete to authenticated using (user_id=(select auth.uid()));

-- Platform administration is private and grants no implicit access to client CRM.
create table private.platform_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table private.platform_admins enable row level security;
revoke all on private.platform_admins from public,anon,authenticated;
comment on table public.workspaces is 'Empresas assinantes do LumeProspect; não confundir com companies do CRM.';
comment on table public.companies is 'Prospects e clientes atendidos por uma empresa assinante.';
