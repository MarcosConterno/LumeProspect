-- NOVA migration: executar uma vez, depois de 20260914220000_company_finance.sql.
-- Não reaplicar a migration financeira anterior. Não altera lançamentos existentes.
begin;

create function private.finance_search_entries(target uuid, filters jsonb, export_all boolean default false)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 start_date date; end_date date; min_amount bigint; max_amount bigint; category uuid;
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

 -- Narrow by workspace/date before aggregating payments; reuse one filtered set
 -- for pagination, counts, totals and the complete report in this SQL snapshot.
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
   and position(lower(company_needle) in lower(c.name))>0
   and position(lower(needle) in lower(e.description||' '||c.name||' '||cat.name))>0
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
 ), counts as (
  select count(*) n from matched
 ), paging as (
  select case when export_all then 1 else least(page_number,greatest(1,ceil(n/30.0)::integer)) end page from counts
 ), page_rows as (
  select * from matched order by due_date,id
  limit (case when export_all then 5000 else 30 end)
  offset (select case when export_all then 0 else (page-1)*30 end from paging)
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

create function public.finance_search_entries(target uuid, filters jsonb, export_all boolean default false)
returns jsonb language sql stable security invoker set search_path='' as $$
 select private.finance_search_entries(target,filters,export_all)
$$;
revoke all on function private.finance_search_entries(uuid,jsonb,boolean),public.finance_search_entries(uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function private.finance_search_entries(uuid,jsonb,boolean),public.finance_search_entries(uuid,jsonb,boolean) to authenticated;
commit;
