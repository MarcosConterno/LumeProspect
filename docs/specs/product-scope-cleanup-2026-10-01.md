# Enxugamento inicial do produto — 01/10/2026

## Escopo definido

O menu principal passa a oferecer somente:

- Clientes
- CRM
- Financeiro
- Agenda
- Configurações

Serviços deixa de ser um módulo de navegação principal e passa a ser mantido em **Configurações → Serviços**, sempre no workspace/ambiente da empresa assinante.

Masters continuam usando **Ambientes** e a administração da Lume sem alteração no modelo de acesso ou na seleção de empresa.

## Prospecção pausada

Prospects, favoritos e busca deixam de ser acessíveis pela interface principal neste momento. As rotas antigas redirecionam para Configurações para preservar links existentes sem depender do módulo CRM.

O banco não remove as tabelas de prospecção nem o vínculo opcional `deals.prospect_id`. A migration `20261001090000_deactivate_prospecting_module.sql` desativa o módulo `prospeccao` em todos os workspaces, preservando as permissões e os dados para futura reativação.

O valor `companies.lifecycle_status = 'prospect'` permanece. Ele representa o estágio de uma empresa atendida no CRM e não deve ser confundido com o módulo de prospecção.

## Ordem operacional

1. Aplicar a migration de desativação no Supabase, somente se ainda não aplicada.
2. Executar `npm run lint`.
3. Executar `npm run build`.
4. Homologar os menus, os redirecionamentos, Configurações → Serviços e a entrada de masters em Ambientes.

Nenhuma tabela de prospecção deve ser removida até uma decisão futura específica, acompanhada de inventário dos negócios que ainda possuam `prospect_id`.
