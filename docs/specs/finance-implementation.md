# Financeiro — implementação e homologação

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
