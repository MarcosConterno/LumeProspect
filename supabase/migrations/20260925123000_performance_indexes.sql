-- Índices alinhados às consultas mais frequentes do cadastro e da lista de clientes.
-- Execute no Supabase depois das migrations anteriores.
create index if not exists companies_workspace_name_idx
  on public.companies (workspace_id, name, id);

create index if not exists companies_workspace_status_name_idx
  on public.companies (workspace_id, lifecycle_status, name, id);

create index if not exists contacts_workspace_company_active_name_idx
  on public.contacts (workspace_id, company_id, active desc, name, id);
