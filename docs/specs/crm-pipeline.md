# CRM / Pipeline Comercial

## Entidades

Um `Deal` representa uma oportunidade comercial de uma empresa atendida (`companies`), com contato, serviço e responsável relacionados. Deve ser possível cadastrar empresa, contato e negócio manualmente, sem depender de um prospect. A prospecção será uma origem futura de qualificação, desenvolvida por último.

O negócio mantém empresa, decisor, serviço, valor, responsável, score, previsão de fechamento, atividade, etapa e saúde operacional.

## Etapas e probabilidades

| Etapa | Probabilidade | Limite de atenção |
| --- | ---: | ---: |
| Novo | 10% | 2 dias |
| Contato iniciado | 20% | 3 dias |
| Reunião / Diagnóstico | 40% | 5 dias |
| Proposta enviada | 60% | 5 dias |
| Negociação | 80% | 7 dias |

Receita ponderada é calculada como `valor do negócio * probabilidade da etapa` para negócios abertos.

## Saúde e atenção

Um negócio precisa de atenção quando a próxima atividade está atrasada, não existe próxima atividade, ultrapassou o limite da etapa ou passou da data prevista de fechamento. Dentro das colunas, a ordenação prioriza atrasados, atenção, sem atividade e negócios no prazo; em empate, o maior score vem primeiro.

## Componentes principais

- `crm-workspace.tsx`: estado local, tabs, filtros e coordenação do pipeline.
- `crm-stats.tsx`: métricas calculadas.
- `pipeline-column.tsx` e `deal-card.tsx`: Kanban e drag-and-drop nativo.
- `deal-drawer.tsx`: visão lateral da oportunidade e conclusão de atividade.
- `new-deal-form.tsx`: criação local de negócios.

## Implementado nesta etapa

Pipeline, lista, previsão simples, métricas, filtros, ordenação, criação local, seleção de card, drawer, etapas, saúde, score, atividades mockadas e movimentação por arrastar ou pelo botão de avanço.

## Estado atualizado em 14/09/2026

A autenticação e a empresa ativa estão conectadas ao Supabase. A tela do pipeline ainda consome mocks: os responsáveis, contatos e negócios exibidos não são os cadastros reais. As alterações feitas nessa tela permanecem em memória.

O banco já contém empresas, contatos, serviços, negócios, atividades, histórico, notas e metadados de arquivos, além do bucket privado `crm-files`. Ações e repositório do CRM foram escritos, mas a integração da tela, formulários reais e testes ponta a ponta ainda estão em andamento. As abas de atividades, notas e arquivos continuam incompletas.

## Próximos passos

Seguir a organização administrativa e dos cadastros definida em `project-audit-2026-09-14.md`. Depois conectar o pipeline aos dados reais, corrigir datas e campos fixos, implementar as abas e ganho/perda. A integração financeira deve distinguir fechamento comercial, geração de títulos e recebimento; não criar receita recebida automaticamente ao marcar um negócio como ganho.
