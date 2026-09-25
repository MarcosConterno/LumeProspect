-- LIMPEZA MANUAL E DESTRUTIVA DO FINANCEIRO
-- Remove todos os lançamentos de todas as empresas do sistema.
-- Preserva finance_categories e todos os demais cadastros.
-- Execute somente no SQL Editor do Supabase quando quiser iniciar os testes.

begin;

-- Dependências dos lançamentos precisam ser removidas primeiro.
delete from public.finance_history;
delete from public.finance_payments;
delete from public.finance_entries;

-- Conferência: lançamentos, baixas e histórico devem estar zerados.
select
  (select count(*) from public.finance_entries) as lancamentos,
  (select count(*) from public.finance_payments) as pagamentos,
  (select count(*) from public.finance_history) as historico,
  (select count(*) from public.finance_categories) as categorias_preservadas;

commit;
