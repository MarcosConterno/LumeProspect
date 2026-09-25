-- SEED MANUAL DE TESTE DO FINANCEIRO
-- Cria 5 lançamentos para "Cliente 1" e 5 para "teste".
-- Não cria nem altera categorias. Exige que as categorias ativas já existam.
-- Todos os valores individuais ficam abaixo de R$ 20.000,00.
-- Execute depois de reset-finance-data.sql, no SQL Editor do Supabase.

begin;

do $$
declare
  company_count integer;
  missing_category_count integer;
begin
  select count(*) into company_count
  from public.companies
  where lower(trim(name)) in ('cliente 1', 'teste')
    and lifecycle_status <> 'inactive';

  if company_count <> 2 then
    raise exception 'Esperadas 2 empresas ativas chamadas Cliente 1 e teste; encontradas %.', company_count;
  end if;

  select count(*) into missing_category_count
  from (
    select c.workspace_id, k.kind
    from public.companies c
    cross join (values ('receivable'), ('payable')) as k(kind)
    where lower(trim(c.name)) in ('cliente 1', 'teste')
      and c.lifecycle_status <> 'inactive'
      and not exists (
        select 1
        from public.finance_categories fc
        where fc.workspace_id = c.workspace_id
          and fc.kind = k.kind
          and fc.active
      )
  ) missing;

  if missing_category_count > 0 then
    raise exception 'Cada empresa precisa ter uma categoria financeira ativa de receber e uma de pagar.';
  end if;

  if exists (select 1 from public.finance_entries) then
    raise exception 'O financeiro ainda possui lançamentos. Execute o reset-finance-data.sql antes deste seed.';
  end if;
end $$;

create temporary table _lume_finance_seed (
  id uuid primary key,
  workspace_id uuid not null,
  company_id uuid not null,
  category_id uuid not null,
  kind text not null,
  description text not null,
  launch_date date not null,
  due_date date not null,
  amount_cents bigint not null,
  paid_offset integer
) on commit drop;

insert into _lume_finance_seed (id, workspace_id, company_id, category_id, kind, description, launch_date, due_date, amount_cents, paid_offset)
select
  gen_random_uuid(),
  c.workspace_id,
  c.id,
  category.id,
  item.kind,
  item.description,
  current_date,
  current_date + item.due_offset,
  item.amount_cents,
  item.paid_offset
from public.companies c
cross join lateral (
  values
    ('receivable', 'Plano comercial mensal', 480000::bigint, 7, null::integer),
    ('receivable', 'Projeto de prospecção', 720000::bigint, -6, -2),
    ('receivable', 'Consultoria estratégica', 360000::bigint, 18, null::integer),
    ('payable', 'Licença de software', 150000::bigint, 5, null::integer),
    ('payable', 'Fornecedor de dados', 90000::bigint, -3, -1)
) as item(kind, description, amount_cents, due_offset, paid_offset)
cross join lateral (
  select fc.id
  from public.finance_categories fc
  where fc.workspace_id = c.workspace_id
    and fc.kind = item.kind
    and fc.active
  order by fc.name, fc.id
  limit 1
) category
where lower(trim(c.name)) in ('cliente 1', 'teste')
  and c.lifecycle_status <> 'inactive';

insert into public.finance_entries (
  id, workspace_id, company_id, category_id, kind, description,
  launch_date, due_date, amount_cents, notes, created_by
)
select
  id, workspace_id, company_id, category_id, kind, description,
  launch_date, due_date, amount_cents,
  'Dados criados para teste do financeiro.',
  null
from _lume_finance_seed;

insert into public.finance_history (workspace_id, entry_id, actor_id, event, details)
select
  workspace_id,
  id,
  null,
  'entry.created',
  jsonb_build_object('source', 'seed-finance-test-data.sql')
from _lume_finance_seed;

insert into public.finance_payments (
  id, workspace_id, entry_id, amount_cents, paid_on, notes, created_by
)
select
  gen_random_uuid(),
  workspace_id,
  id,
  amount_cents,
  current_date + paid_offset,
  'Baixa criada para teste do financeiro.',
  null
from _lume_finance_seed
where paid_offset is not null;

insert into public.finance_history (workspace_id, entry_id, actor_id, event, details)
select
  seed.workspace_id,
  seed.id,
  null,
  'payment.created',
  jsonb_build_object(
    'source', 'seed-finance-test-data.sql',
    'amountCents', seed.amount_cents,
    'paidOn', current_date + seed.paid_offset
  )
from _lume_finance_seed seed
where seed.paid_offset is not null;

-- Conferência por empresa: 5 lançamentos e saldo realizado positivo.
select
  c.name as empresa,
  count(distinct e.id) as lancamentos,
  coalesce(sum(case when e.kind = 'receivable' then e.amount_cents else 0 end), 0) as total_a_receber,
  coalesce(sum(case when e.kind = 'payable' then e.amount_cents else 0 end), 0) as total_a_pagar,
  coalesce(sum(case when e.kind = 'receivable' then p.amount_cents else -p.amount_cents end), 0) as saldo_realizado
from public.companies c
left join public.finance_entries e on e.workspace_id = c.workspace_id and e.company_id = c.id
left join public.finance_payments p on p.workspace_id = e.workspace_id and p.entry_id = e.id and p.reversed_at is null
where lower(trim(c.name)) in ('cliente 1', 'teste')
group by c.workspace_id, c.id, c.name
order by c.name;

commit;
