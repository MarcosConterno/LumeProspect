-- Otimizações complementares ao 20260928150000_finance_search_indexes.sql.
-- Executar no Supabase depois das migrations financeiras anteriores.
-- Não altera regras de negócio, permissões ou isolamento por workspace.
begin;

set local search_path = public, extensions;

-- Buscas administrativas usam contains (ILIKE '%texto%').
create index if not exists contacts_name_trgm_idx
  on public.contacts using gin (name gin_trgm_ops);

create index if not exists services_name_trgm_idx
  on public.services using gin (name gin_trgm_ops);

create index if not exists workspaces_name_trgm_idx
  on public.workspaces using gin (name gin_trgm_ops);

-- A tela de usuários pagina por workspace e created_at.
create index if not exists workspace_members_workspace_created_idx
  on public.workspace_members (workspace_id, created_at, user_id);

-- Consolida a primeira carga do financeiro em uma consulta SQL.
-- A versão anterior chamava finance_snapshot, finance_search_entries e
-- finance_dashboard em sequência, recalculando pagamentos em cada função.
create or replace function private.finance_bootstrap(target uuid, filters jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  month_value text:=coalesce(filters->>'month','');
  start_date date;
  end_date date;
  month_start date;
  month_end date;
  scope_start date;
  scope_end date;
  min_amount bigint;
  max_amount bigint;
  category uuid;
  kind_filter text:=coalesce(filters->>'type','all');
  status_filter text:=coalesce(filters->>'status','all');
  needle text:=trim(coalesce(filters->>'query',''));
  company_needle text:=trim(coalesce(filters->>'companyQuery',''));
  page_number integer:=coalesce((filters->>'page')::integer,1);
  today date:=(now() at time zone 'America/Sao_Paulo')::date;
  result jsonb;
begin
  perform private.finance_guard(target,'read');

  if filters is null or jsonb_typeof(filters)<>'object'
    or month_value !~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
    or coalesce(filters->>'dateFrom','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or coalesce(filters->>'dateTo','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'Invalid search filters' using errcode='23514';
  end if;

  month_start:=(month_value||'-01')::date;
  month_end:=(month_start+interval '1 month')::date;
  start_date:=(filters->>'dateFrom')::date;
  end_date:=(filters->>'dateTo')::date;
  scope_start:=least(month_start,start_date);
  scope_end:=greatest(month_end,(end_date+1));
  min_amount:=nullif(filters->>'minAmountCents','')::bigint;
  max_amount:=nullif(filters->>'maxAmountCents','')::bigint;
  category:=nullif(filters->>'categoryId','')::uuid;

  if start_date<date '1900-01-01' or end_date>date '2100-12-31' or start_date>end_date
    or month_start<date '1900-01-01' or month_start>date '2100-12-01'
    or kind_filter not in ('all','receivable','payable')
    or status_filter not in ('all','any','open','overdue','partial','settled','cancelled')
    or page_number not between 1 and 1000000
    or length(needle)>150 or length(company_needle)>160
    or (min_amount is not null and min_amount not between 1 and 999999999999)
    or (max_amount is not null and max_amount not between 1 and 999999999999)
    or min_amount>max_amount then
    raise exception 'Invalid search filters' using errcode='23514';
  end if;

  if category is not null
    and not exists(select 1 from public.finance_categories where workspace_id=target and id=category) then
    raise exception 'Category unavailable' using errcode='23514';
  end if;

  with entry_scope as materialized (
    select e.*,c.name company_name,cat.name category_name
    from public.finance_entries e
    join public.companies c on c.workspace_id=e.workspace_id and c.id=e.company_id
    join public.finance_categories cat on cat.workspace_id=e.workspace_id and cat.id=e.category_id
    where e.workspace_id=target
      and e.due_date>=scope_start
      and e.due_date<scope_end
  ), paid as materialized (
    select p.entry_id,
      sum(p.amount_cents) filter(where p.reversed_at is null) amount,
      count(*) payment_count
    from public.finance_payments p
    join entry_scope e on e.workspace_id=p.workspace_id and e.id=p.entry_id
    where p.workspace_id=target
    group by p.entry_id
  ), scoped as materialized (
    select e.*,coalesce(p.amount,0) paid,coalesce(p.payment_count,0)>0 has_payments
    from entry_scope e
    left join paid p on p.entry_id=e.id
  ), period as materialized (
    select * from scoped where due_date>=month_start and due_date<month_end
  ), candidates as materialized (
    select * from scoped
    where due_date between start_date and end_date
      and (kind_filter='all' or kind=kind_filter)
      and (category is null or category_id=category)
      and (min_amount is null or amount_cents>=min_amount)
      and (max_amount is null or amount_cents<=max_amount)
      and (company_needle='' or company_name ilike '%'||company_needle||'%')
      and (needle='' or description ilike '%'||needle||'%' or company_name ilike '%'||needle||'%' or category_name ilike '%'||needle||'%')
  ), matched as materialized (
    select * from candidates
    where case status_filter
      when 'any' then true
      when 'all' then cancelled_at is null
      when 'cancelled' then cancelled_at is not null
      when 'open' then cancelled_at is null and paid<amount_cents
      when 'overdue' then cancelled_at is null and paid<amount_cents and due_date<today
      when 'partial' then cancelled_at is null and paid>0 and paid<amount_cents
      when 'settled' then cancelled_at is null and paid=amount_cents
      else false
    end
  ), counts as (
    select count(*) n from matched
  ), paging as (
    select case when exists(select 1 from counts where n>0)
      then least(page_number,greatest(1,ceil(n/10.0)::integer)) else 1 end page
    from counts
  ), page_rows as materialized (
    select * from matched
    order by due_date,id
    limit 10
    offset ((select page from paging)-1)*10
  ), cash as materialized (
    select p.amount_cents,p.paid_on,e.kind
    from public.finance_payments p
    join public.finance_entries e on e.workspace_id=p.workspace_id and e.id=p.entry_id
    where p.workspace_id=target
      and p.reversed_at is null
      and p.paid_on>=date_trunc('year',month_start)::date
      and p.paid_on<(date_trunc('year',month_start)+interval '1 year')::date
  ), page_json as materialized (
    select r.due_date,r.id,private.finance_entry_json(e) entry_json
    from page_rows r
    join public.finance_entries e on e.workspace_id=target and e.id=r.id
  )
  select jsonb_build_object(
    'workspace',target,
    'today',today,
    'month',month_value,
    'page',(select page from paging),
    'count',(select n from counts),
    'entries',coalesce((select jsonb_agg(entry_json order by due_date,id) from page_json),'[]'::jsonb),
    'categories',coalesce((
      select jsonb_agg(jsonb_build_object('id',id,'name',name,'kind',kind,'active',active,'version',version) order by kind,name,id)
      from public.finance_categories where workspace_id=target
    ),'[]'::jsonb),
    'permissions',jsonb_build_object(
      'create',private.module_access(target,'financeiro','create'),
      'update',private.module_access(target,'financeiro','update'),
      'cancel',private.module_access(target,'financeiro','delete'),
      'settle',private.module_access(target,'financeiro','settle'),
      'reverse',private.module_access(target,'financeiro','reverse'),
      'categories',private.workspace_role(target) in ('owner','admin')
    ),
    'totals',jsonb_build_object(
      'receivable',coalesce((select sum(amount_cents-paid) from period where kind='receivable' and cancelled_at is null),0),
      'payable',coalesce((select sum(amount_cents-paid) from period where kind='payable' and cancelled_at is null),0),
      'received',coalesce((select sum(amount_cents) from cash where kind='receivable' and paid_on>=month_start and paid_on<month_end),0),
      'paid',coalesce((select sum(amount_cents) from cash where kind='payable' and paid_on>=month_start and paid_on<month_end),0),
      'overdue',coalesce((select sum(amount_cents-paid) from period where cancelled_at is null and paid<amount_cents and due_date<today),0),
      'overdueCount',coalesce((select count(*) from period where cancelled_at is null and paid<amount_cents and due_date<today),0),
      'receivableOpenCount',coalesce((select count(*) from period where kind='receivable' and cancelled_at is null and paid<amount_cents),0),
      'payableOpenCount',coalesce((select count(*) from period where kind='payable' and cancelled_at is null and paid<amount_cents),0)
    ),
    'monthly',coalesce((
      select jsonb_agg(jsonb_build_object(
        'month',n,
        'receivable',coalesce((select sum(amount_cents) from cash where kind='receivable' and extract(month from paid_on)=n),0),
        'payable',coalesce((select sum(amount_cents) from cash where kind='payable' and extract(month from paid_on)=n),0)
      ) order by n)
      from generate_series(1,12) n
    ),'[]'::jsonb),
    'expenses',coalesce((
      select jsonb_agg(x order by x.value desc,x.name)
      from (
        select category_id as id,category_name as name,sum(amount_cents) as value
        from period where kind='payable' and cancelled_at is null
        group by category_id,category_name
      ) x
    ),'[]'::jsonb),
    'search',jsonb_build_object(
      -- A tela usa o array raiz; manter uma segunda cópia aqui só aumenta
      -- o JSON/RSC sem acrescentar dados ao cliente.
      'entries','[]'::jsonb,
      'count',(select n from counts),
      'page',(select page from paging),
      'today',today,
      'dateFrom',start_date,
      'dateTo',end_date,
      'categoryName',(select name from public.finance_categories where workspace_id=target and id=category),
      'totals',jsonb_build_object(
        'receivable',coalesce((select sum(amount_cents-paid) from matched where kind='receivable' and cancelled_at is null),0),
        'payable',coalesce((select sum(amount_cents-paid) from matched where kind='payable' and cancelled_at is null),0),
        'received',coalesce((select sum(paid) from matched where kind='receivable' and cancelled_at is null),0),
        'paid',coalesce((select sum(paid) from matched where kind='payable' and cancelled_at is null),0)
      )
    )
  ) into result;

  return result;
end $$;

create or replace function public.finance_bootstrap(target uuid, filters jsonb)
returns jsonb language sql security invoker set search_path='' as $$
  select private.finance_bootstrap(target,filters)
$$;

revoke all on function private.finance_bootstrap(uuid,jsonb),public.finance_bootstrap(uuid,jsonb) from public,anon,authenticated;
grant execute on function private.finance_bootstrap(uuid,jsonb),public.finance_bootstrap(uuid,jsonb) to authenticated;

commit;
