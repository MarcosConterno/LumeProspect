-- Auditoria de performance do banco Lume.
--
-- Execute no SQL Editor do Supabase. O script não altera dados permanentes:
-- usa somente tabelas temporárias e termina com ROLLBACK.
--
-- O relatório combina:
--   1. volume aproximado e estatísticas de scans por tabela;
--   2. uso e tamanho dos índices relevantes;
--   3. presença dos índices esperados pelas consultas atuais;
--   4. pg_stat_statements, quando a extensão estiver habilitada;
--   5. planos reais de consultas representativas com BUFFERS.
--
-- Observação: estatísticas de pg_stat_* são acumuladas desde o último reset
-- do banco e podem refletir consultas de outros usuários. Leia-as junto dos
-- planos e, se necessário, repita a auditoria após um período de uso normal.

begin;

set local search_path = public, extensions;

create temp table performance_audit_target on commit drop as
with company_size as (
  select workspace_id,count(*) as companies
  from public.companies
  group by workspace_id
), entry_size as (
  select workspace_id,count(*) as entries
  from public.finance_entries
  group by workspace_id
), payment_size as (
  select workspace_id,count(*) as payments
  from public.finance_payments
  group by workspace_id
), workspace_size as (
  select w.id as workspace_id,w.name,w.is_lume,
    coalesce(c.companies,0) as companies,
    coalesce(e.entries,0) as entries,
    coalesce(p.payments,0) as payments
  from public.workspaces w
  left join company_size c on c.workspace_id=w.id
  left join entry_size e on e.workspace_id=w.id
  left join payment_size p on p.workspace_id=w.id
)
select *
from workspace_size
order by entries desc,companies desc,case when is_lume then 1 else 0 end,workspace_id
limit 1;

-- O planejador não coleta estatísticas automaticamente para tabelas
-- temporárias; sem ANALYZE, os planos podem estimar centenas de linhas
-- quando o alvo real tem apenas uma.
analyze performance_audit_target;

select
  'target_workspace' as report,
  workspace_id,
  name,
  is_lume,
  companies,
  entries,
  payments
from performance_audit_target;

select
  'table_statistics' as report,
  s.relname as table_name,
  s.n_live_tup as estimated_rows,
  s.seq_scan,
  s.idx_scan,
  round(100.0*s.seq_scan/nullif(s.seq_scan+s.idx_scan,0),2) as seq_scan_pct,
  s.n_tup_ins,
  s.n_tup_upd,
  s.n_tup_del,
  s.n_mod_since_analyze,
  s.last_analyze,
  s.last_autoanalyze
from pg_catalog.pg_stat_user_tables s
where s.schemaname='public'
  and s.relname in (
    'workspaces','workspace_members','companies','contacts','services',
    'deals','deal_activities','deal_notes','deal_files',
    'finance_categories','finance_entries','finance_payments','finance_history'
  )
order by s.n_live_tup desc,s.relname;

create temp table performance_expected_indexes (
  index_name text not null,
  table_name text not null,
  purpose text not null
) on commit drop;

insert into performance_expected_indexes(index_name,table_name,purpose) values
  ('companies_workspace_name_idx','companies','listas e opções de empresas por workspace e nome'),
  ('companies_workspace_status_name_idx','companies','filtro de status com ordenação por nome'),
  ('companies_name_trgm_idx','companies','busca administrativa por contains'),
  ('contacts_workspace_active_name_idx','contacts','filtro de contatos ativos e ordenação'),
  ('contacts_workspace_company_active_name_idx','contacts','contatos por empresa no detalhe do cliente'),
  ('contacts_name_trgm_idx','contacts','busca administrativa por contains'),
  ('services_workspace_name_idx','services','listas de serviços por workspace e nome'),
  ('services_name_trgm_idx','services','busca administrativa por contains'),
  ('workspace_members_workspace_created_idx','workspace_members','paginação administrativa por criação'),
  ('workspace_members_user_workspace_idx','workspace_members','vínculo usuário/workspace'),
  ('workspaces_name_trgm_idx','workspaces','busca administrativa por contains'),
  ('finance_entries_due_idx','finance_entries','período e ordenação por vencimento'),
  ('finance_entries_workspace_kind_due_idx','finance_entries','período filtrado por tipo'),
  ('finance_entries_workspace_category_due_idx','finance_entries','período filtrado por categoria'),
  ('finance_entries_workspace_active_due_idx','finance_entries','lançamentos não cancelados'),
  ('finance_entries_description_trgm_idx','finance_entries','busca textual de descrição'),
  ('finance_payments_entry_idx','finance_payments','pagamentos por lançamento'),
  ('finance_payments_workspace_entry_active_idx','finance_payments','soma de pagamentos não estornados'),
  ('finance_payments_cash_movements_idx','finance_payments','caixa por data de pagamento'),
  ('finance_payments_reversed_movements_idx','finance_payments','auditoria por data de estorno'),
  ('finance_payments_reverse_reason_trgm_idx','finance_payments','busca textual do motivo do estorno'),
  ('deals_workspace_status_stage_idx','deals','pipeline por status/etapa'),
  ('deals_workspace_closing_idx','deals','negócios abertos por fechamento previsto'),
  ('activities_pending_idx','deal_activities','próxima atividade pendente'),
  ('activities_workspace_deal_idx','deal_activities','atividades do detalhe do negócio'),
  ('notes_workspace_deal_idx','deal_notes','notas do detalhe do negócio'),
  ('files_workspace_deal_idx','deal_files','arquivos do detalhe do negócio'),
  ('admin_audit_workspace_time_idx','admin_audit','histórico administrativo por data');

select
  'expected_indexes' as report,
  e.table_name,
  e.index_name,
  case when to_regclass('public.'||e.index_name) is null then 'MISSING' else 'present' end as status,
  e.purpose
from performance_expected_indexes e
order by (case when to_regclass('public.'||e.index_name) is null then 0 else 1 end),
  e.table_name,e.index_name;

create temp table performance_candidate_indexes (
  index_name text not null,
  table_name text not null,
  definition text not null,
  reason text not null
) on commit drop;

insert into performance_candidate_indexes(index_name,table_name,definition,reason) values
  ('workspaces_customer_name_idx','workspaces',
   'on public.workspaces (name,id) where is_lume=false',
   'evita varredura/ordenação da lista de empresas da plataforma sem busca textual'),
  ('services_workspace_active_name_idx','services',
   'on public.services (workspace_id,name,id) where active=true',
   'atende o filtro de serviços ativos mantendo a ordenação por nome'),
  ('companies_workspace_id_idx','companies',
   'on public.companies (workspace_id,id)',
   'atende o carregamento paginado de opções do CRM ordenado por id'),
  ('contacts_workspace_id_idx','contacts',
   'on public.contacts (workspace_id,id)',
   'atende o carregamento paginado de opções do CRM ordenado por id'),
  ('services_workspace_id_idx','services',
   'on public.services (workspace_id,id)',
   'atende o carregamento paginado de opções do CRM ordenado por id'),
  ('deals_workspace_id_idx','deals',
   'on public.deals (workspace_id,id)',
   'atende a carga paginada de negócios ordenada por id'),
  ('activities_workspace_deal_schedule_idx','deal_activities',
   'on public.deal_activities (workspace_id,deal_id,scheduled_at,id)',
   'evita sort no detalhe do negócio, que ordena atividades por scheduled_at e id');

select
  'candidate_indexes' as report,
  c.table_name,
  c.index_name,
  case when to_regclass('public.'||c.index_name) is null then 'candidate' else 'already_present' end as status,
  c.definition,
  c.reason
from performance_candidate_indexes c
order by status desc,c.table_name,c.index_name;

select
  'index_usage' as report,
  s.relname as table_name,
  s.indexrelname as index_name,
  s.idx_scan,
  pg_size_pretty(pg_relation_size(s.indexrelid)) as index_size,
  s.idx_tup_read,
  s.idx_tup_fetch
from pg_catalog.pg_stat_user_indexes s
where s.schemaname='public'
  and s.relname in (
    'workspaces','workspace_members','companies','contacts','services',
    'deals','deal_activities','deal_notes','deal_files',
    'finance_categories','finance_entries','finance_payments','finance_history'
  )
order by s.idx_scan nulls first,pg_relation_size(s.indexrelid) desc,s.relname,s.indexrelname;

create temp table performance_top_queries (
  query text,
  calls bigint,
  total_exec_time double precision,
  mean_exec_time double precision,
  "rows" bigint,
  shared_blks_hit bigint,
  shared_blks_read bigint
) on commit drop;

do $$
declare
  stats_schema text;
  stats_relation text;
begin
  select n.nspname,c.relname
  into stats_schema,stats_relation
  from pg_catalog.pg_extension e
  join pg_catalog.pg_depend d
    on d.refobjid=e.oid
   and d.classid='pg_class'::regclass
   and d.refclassid='pg_extension'::regclass
  join pg_catalog.pg_class c on c.oid=d.objid
  join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where e.extname='pg_stat_statements'
    and c.relname='pg_stat_statements'
  limit 1;

  if stats_schema is not null then
    execute format($sql$
      insert into performance_top_queries
        (query,calls,total_exec_time,mean_exec_time,"rows",shared_blks_hit,shared_blks_read)
      select query,calls,total_exec_time,mean_exec_time,"rows",shared_blks_hit,shared_blks_read
      from %I.%I
      where query ilike any(array[
        '%%finance_%%',
        '%%public.companies%%',
        '%%public.contacts%%',
        '%%public.services%%',
        '%%public.workspaces%%'
      ])
      order by total_exec_time desc
      limit 50
    $sql$,stats_schema,stats_relation);
  end if;
end $$;

select
  'top_statements' as report,
  calls,
  round(total_exec_time::numeric,2) as total_ms,
  round(mean_exec_time::numeric,2) as mean_ms,
  "rows",
  shared_blks_hit,
  shared_blks_read,
  query
from performance_top_queries
order by total_exec_time desc;

-- Planos representativos. O formato JSON permite devolver todos os planos
-- dentro do único resultado final exibido pelo SQL Editor do Supabase. O alvo
-- é o workspace com maior volume; confira is_lume no resultado.
create temp table performance_plans (
  label text primary key,
  plan jsonb not null
) on commit drop;

do $$
declare
  plan jsonb;
begin
  execute $q$
    explain (analyze,verbose,buffers,format json)
    select c.id,c.name,c.lifecycle_status
    from public.companies c
    join performance_audit_target t on t.workspace_id=c.workspace_id
    where c.workspace_id=t.workspace_id
      and c.lifecycle_status<>'inactive'
    order by c.name,c.id
    limit 25
  $q$ into plan;
  insert into performance_plans(label,plan) values ('companies',plan);

  execute $q$
    explain (analyze,verbose,buffers,format json)
    select s.id,s.name,s.active
    from public.services s
    join performance_audit_target t on t.workspace_id=s.workspace_id
    where s.workspace_id=t.workspace_id
      and s.active=true
    order by s.name,s.id
    limit 25
  $q$ into plan;
  insert into performance_plans(label,plan) values ('services',plan);

  execute $q$
    explain (analyze,verbose,buffers,format json)
    select m.user_id,m.role,m.active
    from public.workspace_members m
    join performance_audit_target t on t.workspace_id=m.workspace_id
    where m.workspace_id=t.workspace_id
    order by m.created_at,m.user_id
    limit 25
  $q$ into plan;
  insert into performance_plans(label,plan) values ('workspace_members',plan);

  execute $q$
    explain (analyze,verbose,buffers,format json)
    select e.id,e.due_date,e.kind,e.amount_cents,
      coalesce(sum(p.amount_cents) filter (where p.reversed_at is null),0) as paid_cents
    from public.finance_entries e
    join performance_audit_target t on t.workspace_id=e.workspace_id
    left join public.finance_payments p
      on p.workspace_id=e.workspace_id
     and p.entry_id=e.id
    where e.workspace_id=t.workspace_id
      and e.due_date>=date_trunc('month',current_date)::date
      and e.due_date<(date_trunc('month',current_date)+interval '1 month')::date
    group by e.id,e.due_date,e.kind,e.amount_cents
    order by e.due_date,e.id
    limit 10
  $q$ into plan;
  insert into performance_plans(label,plan) values ('finance_month',plan);
end $$;

select
  'audit_note' as report,
  'MISSING index rows, high seq_scan_pct on large tables, shared_blks_read muito acima de shared_blks_hit ou Sort/Seq Scan nos EXPLAIN são os sinais prioritários.' as interpretation;

-- Resultado consolidado: o SQL Editor normalmente mostra somente o último
-- conjunto de resultados de um script com várias instruções.
select
  'database_performance_audit' as report,
  jsonb_build_object(
    'target',coalesce((select to_jsonb(t) from performance_audit_target t),'{}'::jsonb),
    'tableStatistics',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.estimated_rows desc,x.table_name)
      from (
        select s.relname as table_name,s.n_live_tup as estimated_rows,s.seq_scan,s.idx_scan,
          round(100.0*s.seq_scan/nullif(s.seq_scan+s.idx_scan,0),2) as seq_scan_pct,
          s.n_mod_since_analyze,s.last_analyze,s.last_autoanalyze
        from pg_catalog.pg_stat_user_tables s
        where s.schemaname='public'
          and s.relname in (
            'workspaces','workspace_members','companies','contacts','services',
            'deals','deal_activities','deal_notes','deal_files',
            'finance_categories','finance_entries','finance_payments','finance_history'
          )
      ) x
    ),'[]'::jsonb),
    'missingIndexes',coalesce((
      select jsonb_agg(jsonb_build_object(
        'table',e.table_name,'index',e.index_name,'purpose',e.purpose
      ) order by e.table_name,e.index_name)
      from performance_expected_indexes e
      where to_regclass('public.'||e.index_name) is null
    ),'[]'::jsonb),
    'candidateIndexes',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.table_name,x.index_name)
      from (
        select c.table_name,c.index_name,c.definition,c.reason,
          case when to_regclass('public.'||c.index_name) is null then 'candidate' else 'already_present' end as status
        from performance_candidate_indexes c
      ) x
    ),'[]'::jsonb),
    'indexUsage',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.idx_scan nulls first,x.table_name,x.index_name)
      from (
        select s.relname as table_name,s.indexrelname as index_name,s.idx_scan,
          pg_size_pretty(pg_relation_size(s.indexrelid)) as index_size,
          s.idx_tup_read,s.idx_tup_fetch
        from pg_catalog.pg_stat_user_indexes s
        where s.schemaname='public'
          and s.relname in (
            'workspaces','workspace_members','companies','contacts','services',
            'deals','deal_activities','deal_notes','deal_files',
            'finance_categories','finance_entries','finance_payments','finance_history'
          )
      ) x
    ),'[]'::jsonb),
    'topStatements',coalesce((
      select jsonb_agg(to_jsonb(q) order by q.total_exec_time desc)
      from performance_top_queries q
    ),'[]'::jsonb),
    'planSummary',coalesce((
      select jsonb_object_agg(p.label,jsonb_build_object(
        'nodeType',p.plan #>> '{0,Plan,Node Type}',
        'actualMs',p.plan #>> '{0,Plan,Actual Total Time}',
        'actualRows',p.plan #>> '{0,Plan,Actual Rows}',
        'planRows',p.plan #>> '{0,Plan,Plan Rows}',
        'sharedHitBlocks',p.plan #>> '{0,Plan,Shared Hit Blocks}',
        'sharedReadBlocks',p.plan #>> '{0,Plan,Shared Read Blocks}'
      ) order by p.label)
      from performance_plans p
    ),'{}'::jsonb),
    'plans',coalesce((
      select jsonb_object_agg(p.label,p.plan order by p.label)
      from performance_plans p
    ),'{}'::jsonb),
    'interpretation','Priorize missingIndexes, seq_scan_pct alto em tabelas grandes e planos com Seq Scan ou Sort. Indexes com idx_scan=0 não devem ser removidos automaticamente: as estatísticas podem ter sido zeradas recentemente.'
  ) as details;

rollback;
