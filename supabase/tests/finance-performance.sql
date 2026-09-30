-- Teste de performance do Financeiro.
-- Execute o arquivo inteiro no SQL Editor do Supabase.
--
-- O teste cria fixtures temporárias dentro de uma transação e termina com
-- ROLLBACK. Os dados que já existiam no projeto não são removidos.
--
-- Cenário:
--   - 1 workspace de teste;
--   - 2 empresas atendidas;
--   - 120 lançamentos financeiros, distribuídos entre as empresas;
--   - 12 baixas, sendo 6 estornadas;
--   - 5 RPCs medidas em 5 rodadas, depois de 1 rodada de aquecimento.
--
-- O relatório de tempos aparece no resultado final com mínimo, média e
-- máximo em milissegundos. A medição é feita no servidor com clock_timestamp.

begin;

do $$ begin
  if to_regprocedure('public.finance_bootstrap(uuid,jsonb)') is null
     or to_regprocedure('public.finance_search_entries(uuid,jsonb,boolean)') is null
     or to_regprocedure('public.finance_cash_movements(uuid,jsonb)') is null
     or to_regprocedure('public.finance_reversed_movements(uuid,jsonb)') is null
     or to_regprocedure('public.finance_search_companies(uuid,text)') is null
     or to_regprocedure('public.assign_managed_user(uuid,text,text,boolean)') is null then
    raise exception 'Estrutura financeira incompleta: aplique as migrations financeiras antes do teste.';
  end if;
end $$;

create function pg_temp.finance_perf_assert(ok boolean, label text) returns void
language plpgsql as $$
begin
  if ok is distinct from true then
    raise exception 'FAIL: %', label;
  end if;
end;
$$;

create temp table pg_temp.finance_perf_samples (
  label text not null,
  run integer not null,
  elapsed_ms numeric not null,
  payload_bytes integer not null
) on commit drop;

-- A fixture é criada antes da troca para authenticated. Permita que o
-- papel autenticado grave e leia somente as amostras temporárias.
grant insert,select on table pg_temp.finance_perf_samples to authenticated;

create function pg_temp.measure_finance(label text, target uuid, operation text)
returns void
language plpgsql
as $$
declare
  run integer;
  started timestamptz;
  payload jsonb;
  filters jsonb;
begin
  for run in 0..5 loop
    started:=clock_timestamp();

    case operation
      when 'bootstrap' then
        filters:=jsonb_build_object(
          'month','2026-09',
          'type','all',
          'status','all',
          'query','Performance',
          'dateFrom','2026-09-01',
          'dateTo','2026-09-30',
          'page',1
        );
        payload:=public.finance_bootstrap(target,filters);
      when 'search' then
        filters:=jsonb_build_object(
          'dateFrom','2026-09-01',
          'dateTo','2026-09-30',
          'type','all',
          'status','all',
          'query','Performance',
          'page',1
        );
        payload:=public.finance_search_entries(target,filters,false);
      when 'cash' then
        filters:=jsonb_build_object(
          'month','2026-09',
          'kind','receivable',
          'query','Performance',
          'page',1
        );
        payload:=public.finance_cash_movements(target,filters);
      when 'reversed' then
        filters:=jsonb_build_object(
          'month','2026-09',
          'query','Performance',
          'page',1
        );
        payload:=public.finance_reversed_movements(target,filters);
      when 'companies' then
        payload:=public.finance_search_companies(target,'Performance');
      else
        raise exception 'Operação de performance desconhecida: %', operation;
    end case;

    if run>0 then
      insert into pg_temp.finance_perf_samples(label,run,elapsed_ms,payload_bytes)
      values (
        label,
        run,
        extract(epoch from clock_timestamp()-started)*1000,
        pg_column_size(payload)
      );
    end if;
  end loop;
end;
$$;

do $$
declare
  root uuid;
  admin uuid:=gen_random_uuid();
  workspace uuid;
  client_a uuid;
  client_b uuid;
  receivable_category uuid;
  payable_category uuid;
  marker text:='PERF-'||replace(gen_random_uuid()::text,'-','');
begin
  select user_id into strict root from private.platform_admins limit 1;

  insert into auth.users(id,email,email_confirmed_at)
  values(admin,admin::text||'@example.invalid',now());
  insert into public.profiles(id,full_name)
  values(admin,'Finance performance admin');

  perform set_config('test.perf.marker',marker,true);
  perform set_config('test.perf.admin',admin::text,true);
  perform set_config('test.perf.root',root::text,true);
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.perf.root'),true);

do $$
declare
  admin uuid:=current_setting('test.perf.admin')::uuid;
  marker text:=current_setting('test.perf.marker');
  workspace uuid;
  client_a uuid;
  client_b uuid;
  receivable_category uuid;
  payable_category uuid;
begin
  workspace:=(public.platform_manage(
    'create_client',
    null,
    jsonb_build_object('name',marker||' Workspace')
  )->>'id')::uuid;

  perform public.platform_manage(
    'configure_client',
    workspace,
    jsonb_build_object(
      'name',marker||' Workspace',
      'status','active',
      'version',1,
      'modules',jsonb_build_object('crm',true,'financeiro',true)
    )
  );

  perform set_config('test.perf.workspace',workspace::text,true);

  perform public.assign_managed_user(
    workspace,
    admin::text||'@example.invalid',
    'admin'
  );

  perform set_config('request.jwt.claim.sub',admin::text,true);

  insert into public.companies(workspace_id,name)
  values(workspace,marker||' Cliente A')
  returning id into client_a;

  insert into public.companies(workspace_id,name)
  values(workspace,marker||' Cliente B')
  returning id into client_b;

  select id into strict receivable_category
  from public.finance_categories
  where workspace_id=workspace and kind='receivable' and name='Serviços';

  select id into strict payable_category
  from public.finance_categories
  where workspace_id=workspace and kind='payable' and name='Marketing';

  perform set_config('test.perf.client_a',client_a::text,true);
  perform set_config('test.perf.client_b',client_b::text,true);
  perform set_config('test.perf.receivable_category',receivable_category::text,true);
  perform set_config('test.perf.payable_category',payable_category::text,true);
end $$;

do $$
declare
  workspace uuid:=current_setting('test.perf.workspace')::uuid;
  client_a uuid:=current_setting('test.perf.client_a')::uuid;
  client_b uuid:=current_setting('test.perf.client_b')::uuid;
  receivable_category uuid:=current_setting('test.perf.receivable_category')::uuid;
  payable_category uuid:=current_setting('test.perf.payable_category')::uuid;
  entry_id uuid;
  payment_id uuid;
  company_id uuid;
  category_id uuid;
  entry_type text;
  amount bigint;
  due_date date;
begin
  for index in 1..120 loop
    entry_id:=gen_random_uuid();
    payment_id:=gen_random_uuid();
    company_id:=case when index%2=1 then client_a else client_b end;
    entry_type:=case when index%3=0 then 'payable' else 'receivable' end;
    category_id:=case when entry_type='payable' then payable_category else receivable_category end;
    amount:=100000+(index*137);
    due_date:=date '2026-09-01'+((index-1)%30);

    perform public.finance_save_entry(
      workspace,
      jsonb_build_object(
        'id',entry_id,
        'type',entry_type,
        'companyId',company_id,
        'categoryId',category_id,
        'description',format('Performance lançamento %s',lpad(index::text,3,'0')),
        'launchDate',due_date::text,
        'dueDate',due_date::text,
        'amountCents',amount,
        'notes','Fixture temporária de performance'
      )
    );

    if index<=12 then
      perform public.finance_settle(
        workspace,
        jsonb_build_object(
          'id',payment_id,
          'entryId',entry_id,
          'version',1,
          'amountCents',amount,
          'paidOn','2026-09-15',
          'notes','Fixture temporária de performance'
        )
      );

      if index%2=0 then
        perform public.finance_reverse_payment(
          workspace,
          jsonb_build_object(
            'id',payment_id,
            'entryId',entry_id,
            'version',2,
            'reason','Estorno da fixture de performance'
          )
        );
      end if;
    end if;
  end loop;

  perform pg_temp.finance_perf_assert(
    (select count(*)=120 from public.finance_entries where workspace_id=workspace),
    '120 lançamentos criados'
  );
  perform pg_temp.finance_perf_assert(
    (select count(*)=2 from public.companies where workspace_id=workspace and name like current_setting('test.perf.marker')||'%'),
    '2 clientes criados'
  );
  perform pg_temp.finance_perf_assert(
    (select count(*)=12 from public.finance_payments where workspace_id=workspace),
    '12 baixas criadas'
  );
  perform pg_temp.finance_perf_assert(
    (select count(*)=6 from public.finance_payments where workspace_id=workspace and reversed_at is not null),
    '6 baixas estornadas'
  );
end $$;

select
  current_setting('test.perf.marker') as fixture_marker,
  current_setting('test.perf.workspace') as fixture_workspace,
  (select count(*) from public.companies where workspace_id=current_setting('test.perf.workspace')::uuid) as clients,
  (select count(*) from public.finance_entries where workspace_id=current_setting('test.perf.workspace')::uuid) as entries,
  (select count(*) from public.finance_payments where workspace_id=current_setting('test.perf.workspace')::uuid) as payments,
  (select count(*) from public.finance_payments where workspace_id=current_setting('test.perf.workspace')::uuid and reversed_at is not null) as reversed_payments;

select pg_temp.measure_finance('finance_bootstrap',current_setting('test.perf.workspace')::uuid,'bootstrap');
select pg_temp.measure_finance('finance_search_entries',current_setting('test.perf.workspace')::uuid,'search');
select pg_temp.measure_finance('finance_cash_movements',current_setting('test.perf.workspace')::uuid,'cash');
select pg_temp.measure_finance('finance_reversed_movements',current_setting('test.perf.workspace')::uuid,'reversed');
select pg_temp.measure_finance('finance_search_companies',current_setting('test.perf.workspace')::uuid,'companies');

select
  label,
  count(*) as measured_runs,
  round(min(elapsed_ms),2) as min_ms,
  round(avg(elapsed_ms),2) as avg_ms,
  round(max(elapsed_ms),2) as max_ms,
  min(payload_bytes) as min_payload_bytes,
  max(payload_bytes) as max_payload_bytes
from pg_temp.finance_perf_samples
group by label
order by label;

-- Resultado consolidado: o SQL Editor normalmente exibe apenas o último
-- conjunto de resultados de um script com várias instruções.
select jsonb_build_object(
  'result','PASS',
  'message','Performance measured with 2 clients, 120 entries, 12 payments and 6 reversals. The final ROLLBACK restores the database to its previous state.',
  'fixture',jsonb_build_object(
    'marker',current_setting('test.perf.marker'),
    'workspace',current_setting('test.perf.workspace'),
    'clients',(select count(*) from public.companies where workspace_id=current_setting('test.perf.workspace')::uuid),
    'entries',(select count(*) from public.finance_entries where workspace_id=current_setting('test.perf.workspace')::uuid),
    'payments',(select count(*) from public.finance_payments where workspace_id=current_setting('test.perf.workspace')::uuid),
    'reversedPayments',(select count(*) from public.finance_payments where workspace_id=current_setting('test.perf.workspace')::uuid and reversed_at is not null)
  ),
  'measurements',coalesce((
    select jsonb_agg(jsonb_build_object(
      'label',x.label,
      'measuredRuns',x.measured_runs,
      'minMs',x.min_ms,
      'avgMs',x.avg_ms,
      'maxMs',x.max_ms,
      'minPayloadBytes',x.min_payload_bytes,
      'maxPayloadBytes',x.max_payload_bytes
    ) order by x.label)
    from (
      select
        label,
        count(*) as measured_runs,
        round(min(elapsed_ms),2) as min_ms,
        round(avg(elapsed_ms),2) as avg_ms,
        round(max(elapsed_ms),2) as max_ms,
        min(payload_bytes) as min_payload_bytes,
        max(payload_bytes) as max_payload_bytes
      from pg_temp.finance_perf_samples
      group by label
    ) x
  ),'[]'::jsonb)
) as performance_report;

rollback;
