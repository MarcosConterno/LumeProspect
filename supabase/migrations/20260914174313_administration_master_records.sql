-- Administration and reusable CRM master records. Applied to Supabase Cloud.
alter table public.workspaces
 add column legal_name text,
 add column document_number text,
 add column contact_email text,
 add column phone text,
 add column location text;
alter table public.contacts add column active boolean not null default true;

create function private.prepare_master_record() returns trigger
language plpgsql set search_path = '' as $$
begin
 if tg_op = 'INSERT' then
  new.version := 1;
 else
  if new.id is distinct from old.id then
   raise exception 'Record identity cannot change' using errcode = '23514';
  end if;
  new.created_at := old.created_at;
  new.version := old.version + 1;
 end if;
 new.updated_at := now();
 return new;
end $$;
revoke all on function private.prepare_master_record() from public, anon, authenticated;
do $$ declare t text; begin
 foreach t in array array['profiles','workspaces','companies','contacts','services'] loop
  execute format('alter table public.%I add column version integer not null default 1 check (version > 0)', t);
  execute format('create trigger prepare_master_record before insert or update on public.%I for each row execute function private.prepare_master_record()', t);
 end loop;
end $$;

grant update(legal_name, document_number, contact_email, phone, location) on public.workspaces to authenticated;
alter table public.workspaces add constraint workspace_details_length check (
 length(coalesce(legal_name,'')) <= 200 and length(coalesce(document_number,'')) <= 20
 and length(coalesce(contact_email,'')) <= 254 and length(coalesce(phone,'')) <= 40
 and length(coalesce(location,'')) <= 200
);
-- Partial uniqueness tolerates absent document numbers; never share identities across tenants.
create unique index companies_workspace_document_unique
 on public.companies (workspace_id, document_number)
 where document_number is not null and document_number <> '';
create unique index services_workspace_name_unique
 on public.services (workspace_id, lower(trim(name)));
create index contacts_workspace_active_name_idx on public.contacts(workspace_id,active,name,id);

create function private.check_active_master_links() returns trigger
language plpgsql set search_path = '' as $$
begin
 if tg_table_name = 'contacts' then
  if tg_op = 'INSERT' or new.company_id is distinct from old.company_id then
   if not exists(select 1 from public.companies c where c.workspace_id=new.workspace_id
     and c.id=new.company_id and c.lifecycle_status <> 'inactive') then
    raise exception 'Company unavailable or inactive' using errcode='23514';
   end if;
  end if;
 else
  if new.company_id is not null and (tg_op='INSERT' or new.company_id is distinct from old.company_id) then
   if not exists(select 1 from public.companies c where c.workspace_id=new.workspace_id
     and c.id=new.company_id and c.lifecycle_status <> 'inactive') then
    raise exception 'Company unavailable or inactive' using errcode='23514';
   end if;
  end if;
  if new.contact_id is not null and (tg_op='INSERT' or new.contact_id is distinct from old.contact_id) then
   if not exists(select 1 from public.contacts c where c.workspace_id=new.workspace_id and c.id=new.contact_id and c.active) then
    raise exception 'Contact unavailable or inactive' using errcode='23514';
   end if;
  end if;
  if new.service_id is not null and (tg_op='INSERT' or new.service_id is distinct from old.service_id) then
   if not exists(select 1 from public.services s where s.workspace_id=new.workspace_id and s.id=new.service_id and s.active) then
    raise exception 'Service unavailable or inactive' using errcode='23514';
   end if;
  end if;
 end if;
 return new;
end $$;
revoke all on function private.check_active_master_links() from public, anon, authenticated;
create trigger check_active_master_links before insert or update on public.contacts
 for each row execute function private.check_active_master_links();
create trigger check_active_master_links before insert or update on public.deals
 for each row execute function private.check_active_master_links();

create function private.track_customer_date() returns trigger
language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' then
  new.became_customer_at := case when new.lifecycle_status='customer' then now() else null end;
 else
  new.became_customer_at := old.became_customer_at;
  if new.lifecycle_status='customer' and old.became_customer_at is null then
   new.became_customer_at := now();
  end if;
 end if;
 return new;
end $$;
revoke all on function private.track_customer_date() from public, anon, authenticated;
create trigger track_customer_date before insert or update on public.companies
 for each row execute function private.track_customer_date();

