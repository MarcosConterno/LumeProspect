# Planos por módulos

- CRM: R$ 33,00/mês.
- Financeiro: R$ 33,00/mês.
- Agenda: R$ 42,00/mês.
- Prospecção: R$ 42,00/mês.
- Todos os módulos: R$ 150,00/mês.
- Nenhum módulo: Sem plano, R$ 0,00/mês.

Valores definidos pelo usuário: CRM e Financeiro a R$ 33,00 cada; os R$ 84,00 restantes divididos igualmente entre Agenda e Prospecção.

O formulário de configuração atualiza plano e mensalidade ao selecionar módulos. Salvar mantém as liberações no mecanismo existente; a mensalidade é derivada dessas liberações e da tabela central src/features/platform/pricing.ts. Não há SQL novo nem emissão de cobrança nesta alteração.

Antes de implementar faturamento real, versionar preços contratados e definir vigência das alterações para preservar o histórico.
