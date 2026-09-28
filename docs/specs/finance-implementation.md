# Financeiro — implementação e homologação

> Evolução em 15/09/2026: [busca por período, valor, cliente, categoria e relatório para PDF](finance-search-reports.md). Essa entrega tem migration adicional e validação própria, ainda pendentes.

Revisão estática em 15/09/2026. A última sessão parou durante a implementação, conforme `docs/financeiro-retomada.md`. O módulo já usa RPCs e dados reais; não é mais o esboço em memória. Execução SQL e validação da aplicação continuam sob responsabilidade do usuário.

## Entrega revisada

- Lançamentos a pagar/receber vinculados a empresas atendidas por busca; categorias por empresa.
- Baixas parciais, estorno, cancelamento com motivo, histórico e controle de versão.
- Permissões separadas para leitura, criação, edição, cancelamento, baixa e estorno; categorias administradas por owner/admin, incluindo master.
- Lista paginada por vencimento. Resumos de realizado usam data de baixa; estornos recalculam o período original. Resultado não representa saldo bancário.
- Atualização ao vivo por empresa, consultas periódicas e ao recuperar foco. Nesta revisão, a assinatura foi separada das consultas: filtrar e salvar não recriam a conexão. Respostas de consultas descartadas não substituem o estado atual.

A assinatura utiliza filtros por workspace conforme a [documentação de Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes). A autorização permanece nas RPCs e no RLS.

## SQL: ordem e estado

1. `supabase/migrations/20260914220000_company_finance.sql`: única migration nova desta entrega. Depende da base até `20260914191045_complete_module_guards.sql`, já registrada como aplicada. Executar inteira uma única vez.
2. `supabase/tests/company-finance.sql`: executar inteiro depois da migration. Testa com usuários/empresas temporários e termina em `ROLLBACK`; não é migration. Resultado esperado: `PASS: finance isolation, permissions...`.

As evoluções posteriores do painel e da busca estão separadas em migrations novas. Aplicar somente as que ainda não estiverem registradas no histórico do Supabase, sempre nesta ordem:

3. `supabase/migrations/20260915120000_finance_search_reports.sql`
4. `supabase/migrations/20260925123000_performance_indexes.sql`
5. `supabase/migrations/20260925140000_finance_dashboard_metrics.sql`
6. `supabase/migrations/20260925153000_finance_list_page_size.sql`
7. `supabase/migrations/20260925160000_finance_entry_dates.sql`
8. `supabase/migrations/20260925170000_finance_flow_due_dates.sql`
9. `supabase/migrations/20260925180000_finance_flow_cash_values.sql`
10. `supabase/migrations/20260928100000_finance_snapshot_without_entries.sql`
11. `supabase/migrations/20260928110000_finance_cash_movements.sql`
12. `supabase/migrations/20260928120000_finance_cash_movements_performance.sql`
13. `supabase/migrations/20260928130000_finance_bootstrap.sql`
14. `supabase/migrations/20260928140000_finance_reversed_movements.sql`

As migrations `20260925170000` e `20260925180000` alteram a mesma RPC de dashboard. A última é a versão final: o gráfico anual usa baixas não estornadas pela data efetiva (`paid_on`); vencimento continua sendo usado na lista, nos atrasos, nas previsões e nas despesas por categoria. Não reaplicar a migration intermediária se ela já tiver sido executada.

A migration `20260928100000` adiciona o parâmetro interno `includeEntries`. A tela operacional o envia como `false` porque a lista já vem da RPC paginada de busca; isso evita gerar detalhes duplicados no snapshot. Também há uma proteção de cinco segundos para eventos automáticos de Realtime, foco e visibilidade, evitando recargas em cascata.

A migration `20260928110000` separa as baixas efetivas em uma consulta própria. Entradas e Saídas usam essa origem de caixa; Lançamentos usa somente títulos por vencimento e situação. Não existe uma aba separada de Finalizados: títulos quitados continuam disponíveis pelo filtro de situação dentro de Lançamentos, enquanto o fato financeiro realizado é consultado em Entradas e Saídas. O JSON detalhado dos lançamentos é montado somente para as 10 linhas da página atual, evitando processamento duplicado nas demais baixas do período.

A migration `20260928120000` adiciona um índice parcial alinhado às consultas de caixa (`workspace_id`, `paid_on` e baixa não estornada) e mantém a montagem do JSON limitada à página atual. As leituras operacionais de detalhe e caixa usam o cliente autenticado do Supabase; gravações continuam passando por Server Actions.

A migration `20260928130000` consolida o snapshot, a primeira página de lançamentos e as métricas em uma única RPC. Isso reduz viagens de rede no carregamento inicial sem remover as validações de acesso das funções internas.

## Regra de negócio e contábil

- `Lançamentos` representa títulos por competência operacional e vencimento: contas a receber e contas a pagar, ainda abertas, parciais, quitadas ou canceladas.
- `Entradas` representa somente recebimentos efetivamente baixados, agrupados pela data `paid_on`.
- `Saídas` representa somente pagamentos efetivamente baixados, agrupados pela data `paid_on`.
- Os filtros rápidos `A receber` e `A pagar` mostram somente títulos ainda abertos, incluindo baixas parciais e vencidos; títulos quitados ficam disponíveis apenas pela consulta de situação.
- `Estornados` representa eventos de auditoria filtrados pela data do estorno (`reversed_at`), mantendo a data original da baixa, motivo e responsável.
- Estorno remove a baixa dos totais de caixa e preserva o histórico; cancelamento não apaga o título e exige motivo.
- “Movimentação líquida” é recebimentos menos pagamentos no período. Não é saldo de banco, porque ainda não existe conta financeira, saldo inicial, transferência ou conciliação bancária no modelo.

Essa separação segue a distinção entre regime de competência para as demonstrações usuais e fluxo de caixa baseado em recebimentos e pagamentos, conforme CPC 26 e CPC 03. A próxima etapa contábil, antes de relatórios oficiais, deve adicionar contas financeiras, saldo inicial, transferências, conciliação e competência contábil explícita; não devemos inferir saldo bancário a partir dos títulos.

## Performance esperada

As leituras iniciais passam pela RPC `finance_bootstrap`, que combina snapshot, primeira página e métricas em uma chamada. Entradas e Saídas consultam apenas a página atual de baixas e montam os detalhes dos títulos relacionados somente para aquelas linhas. Estornados usa índice parcial próprio por `workspace_id` e `reversed_at`, também limitado à página atual. O índice parcial de `finance_payments` cobre `workspace_id`, `paid_on` e pagamentos não estornados. Novas consultas financeiras devem preservar filtro por workspace, paginação limitada, índices parciais alinhados aos predicados e nunca montar todos os detalhes em JSON para uma lista inteira.

Em 15/09 o usuário inicialmente confirmou que ainda não havia aplicado a migration. Em seguida enviou imagem do resultado `finance_seed_categories` com valores `NULL`. Isso é compatível com a função que retorna `void`, mas a imagem isolada não comprova a conclusão do arquivo inteiro. Se terminou sem erro, não repetir a migration. O teste começa verificando a presença de parte da estrutura antes de criar fixtures.

O teste cobre isolamento, consulta sem escrita, categorias restritas, vínculos incompatíveis, baixa parcial, repetição sem duplicação, excesso de pagamento, versão antiga, preservação do valor após baixa, estorno, cancelamento, histórico, totais por data, permissões separadas e revogação. Foi preparado e revisado; ainda não executado pelo agente nem confirmado pelo usuário. Concorrência real entre sessões e comportamento visual exigem os testes abaixo.

Se o SQL apresentar erro, compartilhar a mensagem completa. Não reaplicar migrations anteriores. Os tipos financeiros de RPC em `src/types/database.ts` ainda são declarações manuais, não uma regeneração do banco.

## Validação da aplicação

Executar separadamente e compartilhar os resultados atuais:

```bash
npm run lint
npm run build
```

Com o servidor iniciado pelo usuário:

1. Abrir `/financeiro`, criar receita e despesa com uma empresa cadastrada e recarregar para conferir persistência.
2. Criar/editar/inativar uma categoria como administrador. Conferir que membro comum não pode gerenciá-la.
3. Registrar baixa parcial e depois completar; tentar ultrapassar o restante. Conferir valores e histórico após reload.
4. Estornar com motivo, conferir os totais do mês original e cancelar após estornar todas as baixas.
5. Abrir duas abas: salvar na primeira e conferir atualização na segunda. Com edição aberta na segunda, alterar na primeira e tentar salvar o rascunho antigo; deve informar conflito, sem sobrescrever.
6. Digitar filtros rapidamente, trocar o mês e usar Atualizar: a lista final deve corresponder aos últimos filtros. Conferir mês sem movimento.
7. Conferir membro somente leitura, permissão de baixa sem estorno, acesso revogado e isolamento entre empresas. Conferir financeiro liberado sem CRM: busca de empresa existente deve funcionar.
8. Conferir desktop e celular; busca por teclado, formulários abertos durante atualização e mensagens de falha de rede.

Não foram executados npm, servidor ou SQL pelo agente. Não há homologação de produção. Contas bancárias, saldo inicial, conciliação e integração com negócios continuam fora desta entrega; CRM permanece demonstrativo.
