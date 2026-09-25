-- Métricas adicionais para o painel financeiro reformulado.
-- Execute no Supabase depois de 20260914220000_company_finance.sql.
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
    ), cash as (
      select p.amount_cents, p.paid_on, e.kind
      from public.finance_payments p
      join public.finance_entries e on e.workspace_id = p.workspace_id and e.id = p.entry_id
      where p.workspace_id = target
        and p.reversed_at is null
        and p.paid_on >= year_start
        and p.paid_on < (year_start + interval '1 year')::date
    )
    select jsonb_build_object(
      'overdue', coalesce((select sum(amount_cents - paid) from period where paid < amount_cents and due_date < today), 0),
      'overdueCount', coalesce((select count(*) from period where paid < amount_cents and due_date < today), 0),
      'receivableOpenCount', coalesce((select count(*) from period where kind = 'receivable' and paid < amount_cents), 0),
      'payableOpenCount', coalesce((select count(*) from period where kind = 'payable' and paid < amount_cents), 0),
      'monthly', coalesce((
        select jsonb_agg(jsonb_build_object(
          'month', n,
          'receivable', coalesce((select sum(amount_cents) from cash where kind = 'receivable' and extract(month from paid_on) = n), 0),
          'payable', coalesce((select sum(amount_cents) from cash where kind = 'payable' and extract(month from paid_on) = n), 0)
        ) order by n)
        from generate_series(1, 12) n
      ), '[]'::jsonb)
    )
  );
end $$;

create or replace function public.finance_dashboard(target uuid, selected_month text)
returns jsonb language sql security invoker set search_path='' as $$
  select private.finance_dashboard(target, selected_month)
$$;

revoke all on function private.finance_dashboard(uuid, text), public.finance_dashboard(uuid, text) from public, anon;
grant execute on function private.finance_dashboard(uuid, text), public.finance_dashboard(uuid, text) to authenticated;
