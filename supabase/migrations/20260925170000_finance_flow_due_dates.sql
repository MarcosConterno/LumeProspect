-- Faz o gráfico Fluxo financeiro representar os lançamentos por vencimento.
-- Execute depois de 20260925140000_finance_dashboard_metrics.sql.
begin;

create or replace function private.finance_dashboard(target uuid, selected_month text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  month_start date;
  month_end date;
  year_start date;
  today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  perform private.finance_guard(target, 'read');
  if coalesce(selected_month, '') !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then
    raise exception 'Invalid period' using errcode = '23514';
  end if;
  month_start := (selected_month || '-01')::date;
  month_end := (month_start + interval '1 month')::date;
  year_start := date_trunc('year', month_start)::date;

  return (
    with paid as (
      select p.entry_id, sum(p.amount_cents) amount
      from public.finance_payments p
      where p.workspace_id = target and p.reversed_at is null
      group by p.entry_id
    ), period as (
      select e.kind, e.amount_cents, e.due_date, coalesce(p.amount, 0) paid
      from public.finance_entries e
      left join paid p on p.entry_id = e.id
      where e.workspace_id = target
        and e.due_date >= month_start
        and e.due_date < month_end
        and e.cancelled_at is null
    ), year_entries as (
      select e.kind, e.amount_cents, e.due_date
      from public.finance_entries e
      where e.workspace_id = target
        and e.due_date >= year_start
        and e.due_date < (year_start + interval '1 year')::date
        and e.cancelled_at is null
    )
    select jsonb_build_object(
      'overdue', coalesce((select sum(amount_cents - paid) from period where paid < amount_cents and due_date < today), 0),
      'overdueCount', coalesce((select count(*) from period where paid < amount_cents and due_date < today), 0),
      'receivableOpenCount', coalesce((select count(*) from period where kind = 'receivable' and paid < amount_cents), 0),
      'payableOpenCount', coalesce((select count(*) from period where kind = 'payable' and paid < amount_cents), 0),
      'monthly', coalesce((
        select jsonb_agg(jsonb_build_object(
          'month', n,
          'receivable', coalesce((select sum(amount_cents) from year_entries where kind = 'receivable' and extract(month from due_date) = n), 0),
          'payable', coalesce((select sum(amount_cents) from year_entries where kind = 'payable' and extract(month from due_date) = n), 0)
        ) order by n)
        from generate_series(1, 12) n
      ), '[]'::jsonb)
    )
  );
end $$;

commit;
