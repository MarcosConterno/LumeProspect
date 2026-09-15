# Administração Lume

> Retomada em 15/09/2026: [criação e vínculo de contas pelo master](master-user-access.md). A ação existente foi conectada à tela do cliente; validação da nova entrega pendente.

Decisão: usuário comum pertence a uma empresa. Masters pertencem à Lume e acessam clientes sem criar vínculos adicionais. A empresa interna existente e o usuário confirmado informado serão preservados.

Clientes são provisionados pela Lume, com módulos individuais (CRM, financeiro, agenda e prospecção) e convite para o primeiro administrador. Administradores gerenciam usuários e permissões da própria empresa. Convites são links manuais, sem envio automático de e-mail pelo agente.

O segundo master será convidado pelo painel. Não há senha padrão. O último master não pode ser removido. A autorização usa o registro privado no banco, nunca metadados editáveis do usuário.

## Estado da entrega

- Painel master: /lume. Gestão de masters: /lume/masters.
- Usuário master existente confirmado e vinculado à permissão privada.
- Provisionamento de clientes, módulos, convites, suspensão, equipe e permissões implementados.
- Migrations JÁ APLICADAS online: 20260914190045_lume_control_plane.sql e 20260914191045_complete_module_guards.sql. Não executar novamente.
- supabase/tests/lume-control-plane.sql passou online com rollback: masters, revogação, último master, provisionamento, vínculo único, módulos, permissões, isolamento, suspensão e edição concorrente.
- Lint, build e teste visual ainda pendentes, a executar pelo usuário. Não foram iniciados servidores.
- CRM continua em demonstração. Financeiro, agenda e prospecção não foram desenvolvidos nesta etapa; liberar um módulo não significa que suas funcionalidades estejam concluídas.
- Testes SQL anteriores que criavam workspaces livremente precisam ser adaptados ao novo provisionamento master; não representam mais a regra atual.

## Execução a partir de agora

O usuário executa todo SQL no Supabase e os comandos npm. O agente apenas prepara arquivos e informa a ordem e os resultados esperados. Não há SQL novo pendente de execução nesta entrega.

Próximo passo: usuário executar npm run lint e npm run build e compartilhar os resultados. Em seguida acessar /lume com o login existente para homologar as telas.
