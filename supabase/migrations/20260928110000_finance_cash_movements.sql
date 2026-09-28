-- Lista as baixas efetivamente realizadas, separadas dos títulos por vencimento.
-- Execute no Supabase depois de 20260928100000_finance_snapshot_without_entries.sql.
begin;

create or replace function private.finance_cash_movements(target uuid,filters jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 month_value text:=coalesce(filters->>'month','');
 month_start date;
 month_end date;
 kind_filter text:=coalesce(filters->>'kind','receivable');
 needle text:=trim(coalesce(filters->>'query',''));
 page_number integer:=coalesce((filters->>'page')::integer,1);
 result jsonb;
begin
 perform private.finance_guard(target,'read');
 if month_value !~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
   or kind_filter not in ('receivable','payable')
   or page_number not between 1 and 1000000
   or length(needle)>150 then
  raise exception 'Invalid movement filters' using errcode='23514';
 end if;
 month_start:=(month_value||'-01')::date;
 month_end:=(month_start+interval '1 month')::date;

 with matches as materialized (
  select p.id,p.entry_id,e.kind,e.company_id,c.name company_name,e.category_id,cat.name category_name,
   e.description,e.due_date,p.paid_on,p.amount_cents,p.notes,coalesce(pr.full_name,'Usuário removido') actor
  from public.finance_payments p
  join public.finance_entries e on e.workspace_id=p.workspace_id and e.id=p.entry_id
  join public.companies c on c.workspace_id=e.workspace_id and c.id=e.company_id
  join public.finance_categories cat on cat.workspace_id=e.workspace_id and cat.id=e.category_id
  left join public.profiles pr on pr.id=p.created_by
  where p.workspace_id=target
    and p.reversed_at is null
    and p.paid_on>=month_start
    and p.paid_on<month_end
    and e.kind=kind_filter
    and position(lower(needle) in lower(e.description||' '||c.name||' '||cat.name))>0
  ), page_rows as (
   select * from matches order by paid_on desc,id desc limit 10 offset (
    least(page_number,greatest(1,ceil((select count(*) from matches)/10.0)::integer))-1
   )*10
  ), page_entries as (
   select distinct entry_id from page_rows
  ), page_entry_json as (
   select e.id,private.finance_entry_json(e) entry_json
   from public.finance_entries e
   join page_entries p on p.entry_id=e.id
  )
 select jsonb_build_object(
  'month',month_value,
  'kind',kind_filter,
  'count',(select count(*) from matches),
  'page',case when exists(select 1 from matches) then least(page_number,greatest(1,ceil((select count(*) from matches)/10.0)::integer)) else 1 end,
  'totalCents',coalesce((select sum(amount_cents) from matches),0),
   'movements',coalesce((select jsonb_agg(jsonb_build_object(
     'id',m.id,'entryId',m.entry_id,'type',m.kind,'companyId',m.company_id,'companyName',m.company_name,
     'categoryId',m.category_id,'categoryName',m.category_name,'description',m.description,'dueDate',m.due_date,
     'paidOn',m.paid_on,'amountCents',m.amount_cents,'notes',m.notes,'actor',m.actor,'entry',j.entry_json
    ) order by m.paid_on desc,m.id desc) from page_rows m join page_entry_json j on j.id=m.entry_id),'[]'::jsonb)
 ) into result;
 return result;
end $$;

create or replace function public.finance_cash_movements(target uuid,filters jsonb)
returns jsonb language sql security invoker set search_path='' as $$
 select private.finance_cash_movements(target,filters)
$$;

revoke all on function private.finance_cash_movements(uuid,jsonb),public.finance_cash_movements(uuid,jsonb) from public,anon;
grant execute on function private.finance_cash_movements(uuid,jsonb) to authenticated;
grant execute on function public.finance_cash_movements(uuid,jsonb) to authenticated;

commit;
