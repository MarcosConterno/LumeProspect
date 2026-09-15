# Retomada do financeiro — 14/09/2026

> Atualização em 15/09/2026: retomada e revisão estática realizadas; ciclo Realtime separado das consultas e teste `supabase/tests/company-finance.sql` preparado. Estado atual, evidência da execução enviada pelo usuário e sequência de homologação em [finance-implementation.md](specs/finance-implementation.md). Os itens abaixo preservam o ponto em que a sessão anterior parou; não representam resultados de testes atuais.

## Pedido e combinados

Transformar o esboço financeiro em módulo real por empresa, mantendo o layout (lista à esquerda, gráficos à direita e adaptação para telas menores). Sem dados fictícios. Vincular lançamentos ao cadastro existente de clientes e empresas por busca digitando o nome. Categorias próprias de cada empresa, gerenciadas por administradores, com categorias iniciais. Permissões de leitura, criação, edição, baixas, estornos e cancelamento. Gráficos atualizados a partir do banco.

O usuário executa npm, lint, build, dev e TODO SQL no Supabase online. Não executar comandos operacionais nem ferramentas Supabase. Podemos ler e editar arquivos. Entregar o arquivo SQL ao usuário quando a revisão estiver concluída. Não iniciar servidor. Economizar créditos, sem agentes auxiliares.

## Estado: implementação em andamento, NÃO validada

Nenhum SQL desta entrega foi aplicado. Nenhum lint, build ou teste foi executado. O usuário precisou sair durante a implementação. Ainda não considerar pronto para produção ou orientar a aplicação sem concluir a revisão abaixo.

### Arquivos criados / alterados

- `supabase/migrations/20260914220000_company_finance.sql`: migration transacional PENDENTE. Tabelas finance_categories, finance_entries, finance_payments e finance_history. Vínculos compostos por workspace com companies e categorias. RLS de leitura e mutações exclusivamente por RPC autenticadas. Categorias iniciais para empresas existentes e trigger para novas empresas. Baixas parciais, proteção contra pagamento acima do saldo, identificador de baixa para evitar duplicação em repetição de requisição, controle de versão e bloqueio de linha, estorno e cancelamento com motivo, preservação do histórico. Publicação Realtime de finance_entries e finance_categories. Novos direitos can_settle e can_reverse em member_permissions, com atualização de module_access e manage_member.
- `src/features/finance/types.ts`, `format.ts`, `data/validation.ts`, `data/repository.ts`, `actions.ts`: contratos, valores em centavos, validação e integração por RPC. Contexto autenticado confirma empresa ativa e leitura do módulo. Erro explícito se migration estiver ausente.
- `src/features/finance/data/use-finance.ts`: snapshot real, Realtime por workspace, atualização após mutação, atualização periódica de 60 segundos e ao recuperar foco, proteção contra respostas antigas, ocultação do conteúdo quando consulta falha.
- Componentes em `src/features/finance/components/`: finance-workspace, finance-charts, company-search, entry-form, category-manager, entry-detail. Busca por nome, edição, categorias, registro de baixas, estorno e cancelamento com motivo, histórico, paginação. Preservado o desenho geral.
- `src/app/(app)/financeiro/page.tsx`: carga inicial no servidor, mensagem de indisponibilidade em vez de mock.
- `src/features/finance/finance.css`: estilos adicionais dos formulários e controles, mantendo colunas e responsividade.
- Removido `src/features/finance/mocks/finance.ts`.
- `src/types/database.ts`: declarações manuais dos novos RPCs e campos de member_permissions. NÃO são tipos regenerados do banco; SQL ainda pendente. Tabelas financeiras ainda não adicionadas às declarações porque integração usa RPC JSON.
- `src/features/platform/types.ts`, `actions.ts`, `components/forms.tsx`: painel de equipe agora inclui Registrar baixas e Estornar baixas; Excluir aparece como Cancelar no financeiro. Leitura necessária para demais direitos. Administradores têm acesso completo aos módulos liberados e gerenciam categorias; usuários recebem direitos individuais.

## Regras implementadas

- Previstos e lista: mês do vencimento. A receber/a pagar representam saldo em aberto daquele mês.
- Realizados e gráfico anual: data efetiva das baixas. Recebido menos pago NÃO representa saldo bancário.
- Despesas por categoria: valor integral de contas a pagar não canceladas com vencimento no mês, pagas e previstas.
- Filtros da lista não alteram os totais mensais nem gráficos, que consideram todos os lançamentos do período.
- Estorno invalida a baixa original e recalcula o período original; não é uma nova movimentação de caixa na data do estorno. Discutir evolução contábil depois.
- Após existir qualquer histórico de baixa, tipo, empresa, categoria e valor do lançamento ficam preservados; descrição, vencimento e notas continuam editáveis. Cancelar exige estornar todas as baixas ativas antes.
- Pesquisa retorna somente id/nome de cadastros ativos da mesma empresa. RPC específica permite uso do financeiro sem liberar acesso amplo ao CRM.
- Categorias-base: receitas Serviços, Projetos, Mensalidades, Outras receitas; despesas Ferramentas e assinaturas, Marketing, Administrativo, Estrutura, Impostos e taxas, Pessoal, Outras despesas. Nenhum lançamento artificial.
- Direitos novos de baixa e estorno começam falsos para usuários comuns existentes; administradores e masters mantêm acesso completo conforme regras da plataforma.

## Próximos passos obrigatórios

1. Revisar SQL inteiro contra migrations anteriores e contratos TypeScript. Conferir assinaturas, colunas, checks, permissões, triggers e RLS. Migration depende da estrutura já existente até `20260914191045_complete_module_guards.sql`. Revisar também uso de aliases/composites em funções SQL e retornos JSON.
2. Revisar os componentes novos e integração. Nenhuma compilação foi feita. Verificar especialmente tipagem de retornos FinanceResult, novas permissões nos consumidores MemberPermission, lint React e acessibilidade do autocomplete. Corrigir qualquer problema encontrado.
3. Melhorar separação do ciclo de assinatura Realtime: atualmente o hook recria canal quando filtros/revision mudam; funciona como abordagem inicial, mas vale manter canal estável e disparar fetch separado. Conferir cenários de edição concorrente, formulários abertos durante atualização e proteção de rascunhos. Realtime de pagamentos ocorre via incremento de versão em finance_entries.
4. Preparar `supabase/tests/company-finance.sql` com transação e ROLLBACK, sem dados persistentes. Cobrir isolamento entre empresas, leitura sem escrita, direitos separados, categorias somente admin, vínculo de outra empresa rejeitado, tipos de categoria, baixa parcial, pagamento acima do saldo, repetição de mesma baixa, versão antiga, estorno, cancelamento, cálculos por data e revogação de acesso. Usar como referência `supabase/tests/lume-control-plane.sql` para fixtures auth/users e troca do JWT sujeito. O usuário executará.
5. Documentar aplicação e testes manuais (duas abas para atualização, mês sem movimento, usuário somente leitura, módulos e empresas distintas, telas menores).
6. Entregar ao usuário os arquivos SQL em ordem e pedir resultados de `npm run lint` e `npm run build`, que ele executará. Não afirmar que está validado antes desses retornos.

## Contexto administrativo persistente

Uma pessoa pertence a uma empresa; somente masters Lume acessam todas. Master principal já existente: markos.souza5@gmail.com. Lume cadastra empresas, habilita módulos e cria primeiro administrador. Cada admin gerencia sua própria equipe. Não alterar bootstrap nem recriar o master. Preservar alterações anteriores do projeto.

Módulos Lume: CRM R$33, Financeiro R$33, Agenda R$42, Prospecção R$42; total completo R$150/mês. Configuração e cálculo do plano já implementados anteriormente. Configurações estão no menu de perfil e abrem Minha empresa por padrão. Não mexer nesse escopo agora.
