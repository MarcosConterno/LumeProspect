# Financeiro — esboço para discussão

> Documento histórico do esboço. A implementação posterior com dados reais e suas pendências estão em [finance-implementation.md](finance-implementation.md).

Referência analisada: seção Financeiro de docs/reference/ai-prospect-redesign.html. Ela apresenta entradas, despesas, investimentos, saldo, evolução anual e distribuição de despesas. Seus dados mensais e transações são conjuntos independentes; no esboço, os indicadores e gráficos derivam dos mesmos exemplos.

## Composição

- Resumo superior: a receber, a pagar, recebido e pago.
- Esquerda: lançamentos, busca, filtro de tipo/situação, vencimento, valor e prévia de detalhes.
- Direita: resultado mensal realizado, despesas por categoria e resultado do período.
- Quando a área disponível tiver menos de 820px, os gráficos aparecem abaixo da lista. Abaixo de 540px, as linhas se reorganizam para leitura no celular.
- Novo lançamento abre uma prévia de formulário e permite adicionar um exemplo somente em memória.

Dados fictícios, referência fixa em 14/09/2026. Recarregar restaura os exemplos. Sem SQL, cobrança, baixa real ou integração com CRM. O acesso continua respeitando a liberação existente do módulo.

## Decisões para a próxima conversa

1. Campos obrigatórios e vínculos de um título a receber ou pagar.
2. Diferença entre vencimento, data efetiva de pagamento e competência.
3. Baixas parciais, cancelamento, estorno e histórico.
4. Categorias, contas e saldo inicial.
5. Se o período filtra vencimento ou movimentação e como tratar previsões.

As situações e fórmulas usadas na demonstração servem à apresentação. Investimentos e automações de negócio ganho não foram implementados; dependem das regras futuras.

Validação pendente pelo usuário: npm run lint, npm run build e conferência visual de /financeiro em desktop e celular. Nenhum comando npm ou acesso ao Supabase foi executado pelo agente nesta etapa.
