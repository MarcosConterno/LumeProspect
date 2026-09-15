create table public.deals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  prospect_id uuid references public.prospects(id) on delete set null,
  name text not null,
  value numeric(12, 2) not null default 0 check (value >= 0),
  stage text not null default 'novo' check (stage in ('novo', 'contatado', 'reuniao_marcada', 'fechado')),
  position integer not null default 0,
  closed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index deals_workspace_stage_idx on public.deals(workspace_id, stage, position);
create index deals_prospect_id_idx on public.deals(prospect_id);

alter table public.deals enable row level security;

create policy "deals_select_member"
on public.deals for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "deals_insert_member"
on public.deals for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and created_by = auth.uid()
);

create policy "deals_update_member"
on public.deals for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "deals_delete_member"
on public.deals for delete
to authenticated
using (public.is_workspace_member(workspace_id));
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  legal_name text,
  document_number text,
  website text,
  segment text,
  location text,
  employee_range text,
  revenue_range text,
  lifecycle_status text not null default 'prospect' check (lifecycle_status in ('prospect', 'customer', 'inactive')),
  became_customer_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  role text,
  phone text,
  email text,
  website text,
  linkedin_url text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.prospects
  add column company_id uuid references public.companies(id) on delete set null;

alter table public.deals
  add column company_id uuid references public.companies(id) on delete set null;

create index companies_workspace_status_idx on public.companies(workspace_id, lifecycle_status);
create index contacts_company_id_idx on public.contacts(company_id);
create index prospects_company_id_idx on public.prospects(company_id);
create index deals_company_id_idx on public.deals(company_id);

alter table public.companies enable row level security;
alter table public.contacts enable row level security;

drop policy "prospects_insert_member" on public.prospects;
create policy "prospects_insert_member"
on public.prospects for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and (company_id is null or exists (
    select 1 from public.companies
    where companies.id = prospects.company_id
      and companies.workspace_id = prospects.workspace_id
  ))
);

drop policy "deals_insert_member" on public.deals;
create policy "deals_insert_member"
on public.deals for insert
to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and created_by = auth.uid()
  and (company_id is null or exists (
    select 1 from public.companies
    where companies.id = deals.company_id
      and companies.workspace_id = deals.workspace_id
  ))
);

create policy "companies_select_member"
on public.companies for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "companies_insert_member"
on public.companies for insert
to authenticated
with check (public.is_workspace_member(workspace_id));

create policy "companies_update_member"
on public.companies for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "companies_delete_member"
on public.companies for delete
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "contacts_select_member"
on public.contacts for select
to authenticated
using (
  exists (
    select 1 from public.companies
    where companies.id = contacts.company_id
      and public.is_workspace_member(companies.workspace_id)
  )
);

create policy "contacts_insert_member"
on public.contacts for insert
to authenticated
with check (
  exists (
    select 1 from public.companies
    where companies.id = contacts.company_id
      and public.is_workspace_member(companies.workspace_id)
  )
);

create policy "contacts_update_member"
on public.contacts for update
to authenticated
using (
  exists (
    select 1 from public.companies
    where companies.id = contacts.company_id
      and public.is_workspace_member(companies.workspace_id)
  )
)
with check (
  exists (
    select 1 from public.companies
    where companies.id = contacts.company_id
      and public.is_workspace_member(companies.workspace_id)
  )
);

create policy "contacts_delete_member"
on public.contacts for delete
to authenticated
using (
  exists (
    select 1 from public.companies
    where companies.id = contacts.company_id
      and public.is_workspace_member(companies.workspace_id)
  )
);

drop policy "prospects_update_member" on public.prospects;
create policy "prospects_update_member"
on public.prospects for update
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and (company_id is null or exists (
    select 1 from public.companies
    where companies.id = prospects.company_id
      and companies.workspace_id = prospects.workspace_id
  ))
)
with check (
  public.is_workspace_member(workspace_id)
  and (company_id is null or exists (
    select 1 from public.companies
    where companies.id = prospects.company_id
      and companies.workspace_id = prospects.workspace_id
  ))
);

drop policy "deals_update_member" on public.deals;
create policy "deals_update_member"
on public.deals for update
to authenticated
using (
  public.is_workspace_member(workspace_id)
  and (company_id is null or exists (
    select 1 from public.companies
    where companies.id = deals.company_id
      and companies.workspace_id = deals.workspace_id
  ))
)
with check (
  public.is_workspace_member(workspace_id)
  and (company_id is null or exists (
    select 1 from public.companies
    where companies.id = deals.company_id
      and companies.workspace_id = deals.workspace_id
  ))
);
