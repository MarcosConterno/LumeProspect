-- Evita montar uma lista duplicada de lançamentos durante o carregamento do painel.
-- Execute no Supabase depois das migrations financeiras anteriores.
begin;

create or replace function private.finance_snapshot(target uuid,filters jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 month_start date;
 month_end date;
 year_start date;
 result jsonb;
 page_number integer:=coalesce((filters->>'page')::integer,1);
 include_entries boolean:=coalesce(filters->>'includeEntries','true')='true';
 today date:=(now() at time zone 'America/Sao_Paulo')::date;
begin
 perform private.finance_guard(target,'read');
 if coalesce(filters->>'month','') !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then
  raise exception 'Invalid period' using errcode='23514';
 end if;
 month_start:=((filters->>'month')||'-01')::date;
 if month_start<date '1900-01-01' or month_start>date '2100-12-01' or page_number not between 1 and 1000000 then
  raise exception 'Invalid period or page' using errcode='23514';
 end if;
 month_end:=(month_start+interval '1 month')::date;
 year_start:=date_trunc('year',month_start)::date;
 with paid as (
  select p.entry_id,sum(p.amount_cents) amount
  from public.finance_payments p
  where p.workspace_id=target and p.reversed_at is null
  group by p.entry_id
 ), period as (
  select e.*,coalesce(p.amount,0) paid,c.name company_name,cat.name category_name
  from public.finance_entries e
  left join paid p on p.entry_id=e.id
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
    when 'settled' then e.cancelled_at is null and e.paid=e.amount_cents
    else false end)
   and position(lower(left(coalesce(filters->>'query',''),150)) in lower(e.description||' '||e.company_name||' '||e.category_name))>0
 ), cash as (
  select p.*,e.kind
  from public.finance_payments p
  join public.finance_entries e on e.workspace_id=p.workspace_id and e.id=p.entry_id
  where p.workspace_id=target and p.reversed_at is null
    and p.paid_on>=year_start and p.paid_on<(year_start+interval '1 year')::date
 )
 select jsonb_build_object(
  'workspace',target,
  'today',today,
  'month',to_char(month_start,'YYYY-MM'),
  'page',page_number,
  'count',(select count(*) from filtered),
  'entries',case when include_entries then coalesce((select jsonb_agg(private.finance_entry_json(e) order by e.due_date,e.id)
   from public.finance_entries e
   where e.workspace_id=target and e.id in (select id from filtered order by due_date,id limit 30 offset (page_number-1)*30))) else '[]'::jsonb end,
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

commit;
