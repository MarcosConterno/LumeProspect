-- Consolida snapshot, lista inicial e métricas em uma única chamada RPC.
-- Execute depois de 20260928120000_finance_cash_movements_performance.sql.
begin;

create or replace function private.finance_bootstrap(target uuid,filters jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 snapshot jsonb;
 search_result jsonb;
 dashboard jsonb;
begin
 snapshot:=private.finance_snapshot(target,jsonb_set(coalesce(filters,'{}'::jsonb),'{includeEntries}','false'::jsonb,true));
 search_result:=private.finance_search_entries(target,filters,false);
 dashboard:=private.finance_dashboard(target,filters->>'month');
 return snapshot || jsonb_build_object(
  'entries',coalesce(search_result->'entries','[]'::jsonb),
  'count',coalesce(search_result->'count','0'::jsonb),
  'page',coalesce(search_result->'page','1'::jsonb),
  'search',search_result,
  'monthly',coalesce(dashboard->'monthly','[]'::jsonb),
  'totals',coalesce(snapshot->'totals','{}'::jsonb) || jsonb_build_object(
   'overdue',coalesce(dashboard->'overdue','0'::jsonb),
   'overdueCount',coalesce(dashboard->'overdueCount','0'::jsonb),
   'receivableOpenCount',coalesce(dashboard->'receivableOpenCount','0'::jsonb),
   'payableOpenCount',coalesce(dashboard->'payableOpenCount','0'::jsonb)
  )
 );
end $$;

create or replace function public.finance_bootstrap(target uuid,filters jsonb)
returns jsonb language sql security invoker set search_path='' as $$
 select private.finance_bootstrap(target,filters)
$$;

revoke all on function private.finance_bootstrap(uuid,jsonb),public.finance_bootstrap(uuid,jsonb) from public,anon;
grant execute on function private.finance_bootstrap(uuid,jsonb) to authenticated;
grant execute on function public.finance_bootstrap(uuid,jsonb) to authenticated;

commit;
