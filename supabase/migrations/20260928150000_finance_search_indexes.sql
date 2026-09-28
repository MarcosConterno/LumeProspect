-- Acelera as buscas e filtros usados pelo módulo Financeiro.
-- Execute no Supabase depois de 20260928140000_finance_reversed_movements.sql.
-- Não reaplicar migrations anteriores.
begin;

create extension if not exists pg_trgm with schema extensions;
set local search_path = public, extensions;

-- A lista sempre restringe pela empresa e ordena por vencimento.
create index if not exists finance_entries_workspace_kind_due_idx
  on public.finance_entries (workspace_id, kind, due_date, id);

create index if not exists finance_entries_workspace_category_due_idx
  on public.finance_entries (workspace_id, category_id, due_date, id);

create index if not exists finance_entries_workspace_active_due_idx
  on public.finance_entries (workspace_id, due_date, id)
  where cancelled_at is null;

-- A busca de baixas soma apenas pagamentos ativos por lançamento.
create index if not exists finance_payments_workspace_entry_active_idx
  on public.finance_payments (workspace_id, entry_id, paid_on desc, id desc)
  where reversed_at is null;

-- ILIKE '%texto%' passa a poder usar os índices trigram.
create index if not exists finance_entries_description_trgm_idx
  on public.finance_entries using gin (description gin_trgm_ops);

create index if not exists companies_name_trgm_idx
  on public.companies using gin (name gin_trgm_ops);

create index if not exists finance_categories_name_trgm_idx
  on public.finance_categories using gin (name gin_trgm_ops);

create index if not exists finance_payments_reverse_reason_trgm_idx
  on public.finance_payments using gin (reverse_reason gin_trgm_ops)
  where reversed_at is not null;

create or replace function private.finance_search_companies(target uuid, query text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.finance_guard(target,'read');
 if length(trim(coalesce(query,'')))<2 then return '[]'::jsonb; end if;
 return coalesce((select jsonb_agg(x) from (
  select c.id,c.name from public.companies c
  where c.workspace_id=target and c.lifecycle_status<>'inactive'
   and c.name ilike '%'||left(trim(query),100)||'%'
  order by c.name,c.id limit 15
 ) x),'[]'::jsonb);
end $$;

create or replace function private.finance_search_entries(target uuid, filters jsonb, export_all boolean default false)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare start_date date; end_date date; min_amount bigint; max_amount bigint; category uuid;
 kind_filter text:=coalesce(filters->>'type','all'); status_filter text:=coalesce(filters->>'status','all');
 needle text:=trim(coalesce(filters->>'query','')); company_needle text:=trim(coalesce(filters->>'companyQuery',''));
 page_number integer:=coalesce((filters->>'page')::integer,1); result jsonb;
 today date:=(now() at time zone 'America/Sao_Paulo')::date;
begin
 perform private.finance_guard(target,'read');
 if filters is null or jsonb_typeof(filters)<>'object' or export_all is null
   or coalesce(filters->>'dateFrom','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
   or coalesce(filters->>'dateTo','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
  raise exception 'Invalid search filters' using errcode='23514';
 end if;
 start_date:=(filters->>'dateFrom')::date; end_date:=(filters->>'dateTo')::date;
 min_amount:=nullif(filters->>'minAmountCents','')::bigint;
 max_amount:=nullif(filters->>'maxAmountCents','')::bigint;
 category:=nullif(filters->>'categoryId','')::uuid;
 if start_date<date '1900-01-01' or end_date>date '2100-12-31' or start_date>end_date
   or kind_filter not in ('all','receivable','payable')
   or status_filter not in ('all','any','open','overdue','partial','settled','cancelled')
   or page_number not between 1 and 1000000 or length(needle)>150 or length(company_needle)>160
   or (min_amount is not null and min_amount not between 1 and 999999999999)
   or (max_amount is not null and max_amount not between 1 and 999999999999)
   or min_amount>max_amount then
  raise exception 'Invalid search filters' using errcode='23514';
 end if;
 if category is not null and not exists(select 1 from public.finance_categories where workspace_id=target and id=category) then
  raise exception 'Category unavailable' using errcode='23514';
 end if;

 with candidates as materialized (
  select e.*,c.name company_name,cat.name category_name
  from public.finance_entries e
  join public.companies c on c.workspace_id=e.workspace_id and c.id=e.company_id
  join public.finance_categories cat on cat.workspace_id=e.workspace_id and cat.id=e.category_id
  where e.workspace_id=target and e.due_date between start_date and end_date
   and (kind_filter='all' or e.kind=kind_filter)
   and (category is null or e.category_id=category)
   and (min_amount is null or e.amount_cents>=min_amount)
   and (max_amount is null or e.amount_cents<=max_amount)
   and (company_needle='' or c.name ilike '%'||company_needle||'%')
   and (needle='' or e.description ilike '%'||needle||'%' or c.name ilike '%'||needle||'%' or cat.name ilike '%'||needle||'%')
 ), paid as (
  select p.entry_id,sum(p.amount_cents) filter(where p.reversed_at is null) amount,count(*) payment_count
  from public.finance_payments p join candidates e on e.id=p.entry_id and e.workspace_id=p.workspace_id
  where p.workspace_id=target group by p.entry_id
 ), matched as materialized (
  select e.*,coalesce(p.amount,0) paid,coalesce(p.payment_count,0)>0 has_payments
  from candidates e left join paid p on p.entry_id=e.id
  where case status_filter
   when 'any' then true
   when 'all' then e.cancelled_at is null
   when 'cancelled' then e.cancelled_at is not null
   when 'open' then e.cancelled_at is null and coalesce(p.amount,0)<e.amount_cents
   when 'overdue' then e.cancelled_at is null and coalesce(p.amount,0)<e.amount_cents and e.due_date<today
   when 'partial' then e.cancelled_at is null and coalesce(p.amount,0)>0 and coalesce(p.amount,0)<e.amount_cents
   when 'settled' then e.cancelled_at is null and coalesce(p.amount,0)=e.amount_cents else false end
 ), counts as (select count(*) n from matched),
 paging as (select case when export_all then 1 else least(page_number,greatest(1,ceil(n/10.0)::integer)) end page from counts),
 page_rows as (
  select * from matched order by due_date,id
  limit (case when export_all then 5000 else 10 end)
  offset (select case when export_all then 0 else (page-1)*10 end from paging)
 )
 select jsonb_build_object(
  'count',(select n from counts),'page',(select page from paging),'today',today,
  'dateFrom',start_date,'dateTo',end_date,
  'categoryName',(select name from public.finance_categories where workspace_id=target and id=category),
  'totals',jsonb_build_object(
   'receivable',coalesce((select sum(amount_cents-paid) from matched where kind='receivable' and cancelled_at is null),0),
   'payable',coalesce((select sum(amount_cents-paid) from matched where kind='payable' and cancelled_at is null),0),
   'received',coalesce((select sum(paid) from matched where kind='receivable' and cancelled_at is null),0),
   'paid',coalesce((select sum(paid) from matched where kind='payable' and cancelled_at is null),0)),
  'entries',coalesce((select jsonb_agg(jsonb_build_object(
   'id',id,'type',kind,'companyId',company_id,'companyName',company_name,'categoryId',category_id,'categoryName',category_name,
   'description',description,'dueDate',due_date,'amountCents',amount_cents,'paidCents',paid,'hasPayments',has_payments,
   'notes',notes,'cancelledAt',cancelled_at,'cancelReason',cancel_reason,'version',version
  ) order by due_date,id) from page_rows),'[]'::jsonb)
 ) into result;
 if export_all and (result->>'count')::bigint>5000 then
  raise exception 'Report limit exceeded' using errcode='54000';
 end if;
 return result;
end $$;

create or replace function private.finance_snapshot(target uuid,filters jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare month_start date; month_end date; year_start date; result jsonb;
 page_number integer:=coalesce((filters->>'page')::integer,1);
 include_entries boolean:=coalesce(filters->>'includeEntries','true')='true';
 today date:=(now() at time zone 'America/Sao_Paulo')::date;
 needle text:=trim(left(coalesce(filters->>'query',''),150));
begin
 perform private.finance_guard(target,'read');
 if coalesce(filters->>'month','') !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then raise exception 'Invalid period' using errcode='23514'; end if;
 month_start:=((filters->>'month')||'-01')::date;
 if month_start<date '1900-01-01' or month_start>date '2100-12-01' or page_number not between 1 and 1000000 then raise exception 'Invalid period or page' using errcode='23514'; end if;
 month_end:=(month_start+interval '1 month')::date; year_start:=date_trunc('year',month_start)::date;
 with paid as (
  select p.entry_id,sum(p.amount_cents) amount from public.finance_payments p where p.workspace_id=target and p.reversed_at is null group by p.entry_id
 ), period as (
  select e.*,coalesce(p.amount,0) paid,c.name company_name,cat.name category_name
  from public.finance_entries e left join paid p on p.entry_id=e.id
  join public.companies c on c.workspace_id=e.workspace_id and c.id=e.company_id
  join public.finance_categories cat on cat.workspace_id=e.workspace_id and cat.id=e.category_id
  where e.workspace_id=target and e.due_date>=month_start and e.due_date<month_end
 ), filtered as (
  select * from period e
  where (coalesce(filters->>'type','all')='all' or e.kind=filters->>'type')
   and (case coalesce(filters->>'status','all')
    when 'all' then e.cancelled_at is null
    when 'cancelled' then e.cancelled_at is not null
    when 'open' then e.cancelled_at is null and e.paid<e.amount_cents
    when 'overdue' then e.cancelled_at is null and e.paid<e.amount_cents and e.due_date<today
    when 'partial' then e.cancelled_at is null and e.paid>0 and e.paid<e.amount_cents
    when 'settled' then e.cancelled_at is null and e.paid=e.amount_cents else false end)
   and (needle='' or e.description ilike '%'||needle||'%' or e.company_name ilike '%'||needle||'%' or e.category_name ilike '%'||needle||'%')
 ), cash as (
  select p.*,e.kind from public.finance_payments p join public.finance_entries e on e.workspace_id=p.workspace_id and e.id=p.entry_id
  where p.workspace_id=target and p.reversed_at is null and p.paid_on>=year_start and p.paid_on<(year_start+interval '1 year')::date
 )
 select jsonb_build_object(
  'workspace',target,'today',today,'month',to_char(month_start,'YYYY-MM'),'page',page_number,'count',(select count(*) from filtered),
  'entries',case when include_entries then coalesce((select jsonb_agg(private.finance_entry_json(e) order by e.due_date,e.id) from public.finance_entries e where e.workspace_id=target and e.id in (select id from filtered order by due_date,id limit 30 offset (page_number-1)*30))) else '[]'::jsonb end,
  'categories',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'kind',kind,'active',active,'version',version) order by kind,name,id) from public.finance_categories where workspace_id=target),'[]'::jsonb),
  'permissions',jsonb_build_object('create',private.module_access(target,'financeiro','create'),'update',private.module_access(target,'financeiro','update'),'cancel',private.module_access(target,'financeiro','delete'),'settle',private.module_access(target,'financeiro','settle'),'reverse',private.module_access(target,'financeiro','reverse'),'categories',private.workspace_role(target) in ('owner','admin')),
  'totals',jsonb_build_object(
   'receivable',coalesce((select sum(amount_cents-paid) from period where kind='receivable' and cancelled_at is null),0),
   'payable',coalesce((select sum(amount_cents-paid) from period where kind='payable' and cancelled_at is null),0),
   'received',coalesce((select sum(amount_cents) from cash where kind='receivable' and paid_on>=month_start and paid_on<month_end),0),
   'paid',coalesce((select sum(amount_cents) from cash where kind='payable' and paid_on>=month_start and paid_on<month_end),0)),
  'monthly',(select jsonb_agg(jsonb_build_object('month',n,'value',coalesce((select sum(case when kind='receivable' then amount_cents else -amount_cents end) from cash where extract(month from paid_on)=n),0)) order by n) from generate_series(1,12) n),
  'expenses',coalesce((select jsonb_agg(x order by x.value desc,x.name) from (select category_id as id,category_name as name,sum(amount_cents) as value from period where kind='payable' and cancelled_at is null group by category_id,category_name) x),'[]'::jsonb)
 ) into result;
 return result;
end $$;

create or replace function private.finance_cash_movements(target uuid,filters jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare month_value text:=coalesce(filters->>'month',''); month_start date; month_end date;
 kind_filter text:=coalesce(filters->>'kind','receivable'); needle text:=trim(coalesce(filters->>'query',''));
 page_number integer:=coalesce((filters->>'page')::integer,1); result jsonb;
begin
 perform private.finance_guard(target,'read');
 if month_value !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' or kind_filter not in ('receivable','payable') or page_number not between 1 and 1000000 or length(needle)>150 then
  raise exception 'Invalid movement filters' using errcode='23514';
 end if;
 month_start:=(month_value||'-01')::date; month_end:=(month_start+interval '1 month')::date;
 with matches as materialized (
  select p.id,p.entry_id,e.kind,e.company_id,c.name company_name,e.category_id,cat.name category_name,e.description,e.due_date,p.paid_on,p.amount_cents,p.notes,coalesce(pr.full_name,'Usuário removido') actor
  from public.finance_payments p
  join public.finance_entries e on e.workspace_id=p.workspace_id and e.id=p.entry_id
  join public.companies c on c.workspace_id=e.workspace_id and c.id=e.company_id
  join public.finance_categories cat on cat.workspace_id=e.workspace_id and cat.id=e.category_id
  left join public.profiles pr on pr.id=p.created_by
  where p.workspace_id=target and p.reversed_at is null and p.paid_on>=month_start and p.paid_on<month_end and e.kind=kind_filter
   and (needle='' or e.description ilike '%'||needle||'%' or c.name ilike '%'||needle||'%' or cat.name ilike '%'||needle||'%')
 ), page_rows as (
  select * from matches order by paid_on desc,id desc limit 10 offset (least(page_number,greatest(1,ceil((select count(*) from matches)/10.0)::integer))-1)*10
 ), page_entries as (select distinct entry_id from page_rows), page_entry_json as (
  select e.id,private.finance_entry_json(e) entry_json from public.finance_entries e join page_entries p on p.entry_id=e.id
 )
 select jsonb_build_object('month',month_value,'kind',kind_filter,'count',(select count(*) from matches),
  'page',case when exists(select 1 from matches) then least(page_number,greatest(1,ceil((select count(*) from matches)/10.0)::integer)) else 1 end,
  'totalCents',coalesce((select sum(amount_cents) from matches),0),
  'movements',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'entryId',m.entry_id,'type',m.kind,'companyId',m.company_id,'companyName',m.company_name,'categoryId',m.category_id,'categoryName',m.category_name,'description',m.description,'dueDate',m.due_date,'paidOn',m.paid_on,'amountCents',m.amount_cents,'notes',m.notes,'actor',m.actor,'entry',j.entry_json) order by m.paid_on desc,m.id desc) from page_rows m join page_entry_json j on j.id=m.entry_id),'[]'::jsonb)
 ) into result;
 return result;
end $$;

create or replace function private.finance_reversed_movements(target uuid,filters jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare month_value text:=coalesce(filters->>'month',''); month_start timestamptz; month_end timestamptz;
 needle text:=trim(coalesce(filters->>'query','')); page_number integer:=coalesce((filters->>'page')::integer,1); result jsonb;
begin
 perform private.finance_guard(target,'read');
 if month_value !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' or page_number not between 1 and 1000000 or length(needle)>150 then
  raise exception 'Invalid reversed movement filters' using errcode='23514';
 end if;
 month_start:=((month_value||'-01')::date::timestamp at time zone 'America/Sao_Paulo');
 month_end:=(((month_value||'-01')::date+interval '1 month')::date::timestamp at time zone 'America/Sao_Paulo');
 with matches as materialized (
  select p.id,p.entry_id,e.kind,e.company_id,c.name company_name,e.category_id,cat.name category_name,e.description,e.due_date,p.paid_on,p.amount_cents,p.notes,
   (p.reversed_at at time zone 'America/Sao_Paulo')::date reversed_on,p.reverse_reason,coalesce(created.full_name,'Usuário removido') actor,coalesce(reversed.full_name,'Usuário removido') reverse_actor
  from public.finance_payments p
  join public.finance_entries e on e.workspace_id=p.workspace_id and e.id=p.entry_id
  join public.companies c on c.workspace_id=e.workspace_id and c.id=e.company_id
  join public.finance_categories cat on cat.workspace_id=e.workspace_id and cat.id=e.category_id
  left join public.profiles created on created.id=p.created_by
  left join public.profiles reversed on reversed.id=p.reversed_by
  where p.workspace_id=target and p.reversed_at is not null and p.reversed_at>=month_start and p.reversed_at<month_end
   and (needle='' or e.description ilike '%'||needle||'%' or c.name ilike '%'||needle||'%' or cat.name ilike '%'||needle||'%' or p.reverse_reason ilike '%'||needle||'%')
 ), page_rows as (
  select * from matches order by reversed_on desc,id desc limit 10 offset (least(page_number,greatest(1,ceil((select count(*) from matches)/10.0)::integer))-1)*10
 ), page_entries as (select distinct entry_id from page_rows), page_entry_json as (
  select e.id,private.finance_entry_json(e) entry_json from public.finance_entries e join page_entries p on p.entry_id=e.id
 )
 select jsonb_build_object('month',month_value,'count',(select count(*) from matches),
  'page',case when exists(select 1 from matches) then least(page_number,greatest(1,ceil((select count(*) from matches)/10.0)::integer)) else 1 end,
  'totalCents',coalesce((select sum(amount_cents) from matches),0),
  'movements',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'entryId',m.entry_id,'type',m.kind,'companyId',m.company_id,'companyName',m.company_name,'categoryId',m.category_id,'categoryName',m.category_name,'description',m.description,'dueDate',m.due_date,'paidOn',m.paid_on,'amountCents',m.amount_cents,'notes',m.notes,'actor',m.actor,'reversedOn',m.reversed_on,'reverseReason',m.reverse_reason,'reverseActor',m.reverse_actor,'entry',j.entry_json) order by m.reversed_on desc,m.id desc) from page_rows m join page_entry_json j on j.id=m.entry_id),'[]'::jsonb)
 ) into result;
 return result;
end $$;

commit;
