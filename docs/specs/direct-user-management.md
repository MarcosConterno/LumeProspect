# Cadastro direto de usuários e masters — 16/09/2026

> Continuidade: [configurações centralizadas e tela única de Usuários](central-settings-users.md). Inclui o papel Gerente e nova migration. As rotas de equipe/master descritas abaixo foram centralizadas nessa entrega.

Decisão do usuário: retirar convites. Este documento substitui o fluxo descrito em `login-master-invitations.md` e `master-user-access.md`.

## Regra e telas

- Administrador da empresa: em **Configurações → Equipe**, cadastra nome, e-mail, senha inicial e papel Usuário/Administrador. Pode alterar papéis, permissões e situação da própria equipe pelo formulário existente.
- Master Lume: cadastra usuários em qualquer empresa ativa pelo painel `/lume` e gerencia a equipe entrando no ambiente da empresa. Em `/lume/masters`, cadastra outro master diretamente, com acesso imediato a todas as empresas e módulos.
- **Já possui conta** vincula uma conta confirmada sem trocar sua senha. Uma conta de cliente não é transferida para outro cliente nem para a Lume. A concessão master aceita conta sem vínculo ou vinculada à empresa interna Lume.
- Uma repetição de vínculo de empresa preserva papel, permissões e situação existentes. Alterações devem ser feitas em Equipe. A concessão master é explícita e exclusiva de outro master; pode reativar o vínculo interno de um antigo master.
- Convites e listas de convites saíram das telas. Links antigos mostram orientação para solicitar cadastro. As ações de gerar/aceitar convites foram removidas do aplicativo.
- Autocadastro foi retirado da aplicação; `/cadastro` orienta procurar o administrador. Login e recuperação de senha continuam. Confirmação por e-mail permanece disponível para contas antigas ainda não confirmadas.
- Contas novas já têm e-mail confirmado pela criação administrativa. Não há envio de convite nem exigência de aceite. Não foi implementada troca obrigatória da senha inicial.

## Implementação e autorização

O formulário compartilhado chama uma Server Action que valida o operador, empresa, escopo, papel e dados antes de usar a API Auth Admin. A chave administrativa permanece `server-only`; o navegador recebe apenas a indicação de que a criação está configurada.

`assign_managed_user` verifica as permissões com a sessão do operador, inclusive na consulta prévia e novamente no vínculo definitivo. A implementação privilegiada está no schema privado, com `search_path` fixo e wrapper público `security invoker`. Usuário comum, administrador inativo, empresa suspensa, vínculo entre empresas e tentativa de administrador conceder master são rejeitados. Atribuições registram autoria no histórico. O master principal e os vínculos existentes não são recriados.

A criação no Auth e o vínculo no banco são duas operações. Se a conta foi criada e o vínculo falhar, a aplicação informa a situação e orienta **Já possui conta** após resolver a causa. Não apaga contas para compensar falhas, nem troca senha de uma conta que já existe. Revogação concorrente pode deixar uma conta sem vínculo, mas a RPC impede concluir a concessão sem autorização vigente.

## Aplicação pelo usuário

1. Confirmar `SUPABASE_SECRET_KEY` no ambiente do servidor (ou a alternativa já suportada `SUPABASE_SERVICE_ROLE_KEY`). Não compartilhar a chave no chat e nunca usar prefixo `NEXT_PUBLIC_`. Se alterada, reiniciar o servidor.
2. Executar **uma vez** `supabase/migrations/20260916120000_direct_user_management.sql`, **nova e pendente**. Depende da administração Lume existente até `20260914191045_complete_module_guards.sql`. Não exige a migration de preview de convites `20260915180000`; não reaplicar migrations anteriores. A migration bloqueia criação e aceite de convites antigos, inclusive a operação legada `invite_master`, mantendo o histórico.
3. Executar inteiro `supabase/tests/direct-user-management.sql`. É teste com dados temporários e `ROLLBACK`, não migration. Esperado: `PASS: direct users...`. Os testes históricos que esperavam criar/aceitar convites deixam de corresponder à regra vigente e não devem ser usados como homologação deste fluxo.
4. No Supabase Auth, desativar **Allow new users to sign up** para fechar também o autocadastro direto pela API pública. A retirada do formulário não altera essa configuração remota. Referência: [configuração de Auth](https://supabase.com/docs/guides/auth/general-configuration).
5. Executar separadamente `npm run lint` e `npm run build` e compartilhar os resultados atuais.

Referência da criação administrativa no servidor: [Auth Admin createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser).

## Homologação funcional pendente

1. Como administrador A, criar Usuário e Administrador na empresa A. Entrar com cada conta em janela privada, conferir empresa, módulos e papel após recarregar. O Usuário não deve ver cadastro de pessoas.
2. Alterar papel, permissões e situação em Equipe. Confirmar que administrador A não acessa cadastro ou equipe da empresa B e não cadastra master.
3. Como master, cadastrar em A e B, entrar nos ambientes e ajustar permissões. Suspender B e conferir recusa de novo cadastro nela.
4. Em Masters, criar conta nova e conferir login direto no painel Lume e acesso a módulos de duas empresas. Testar também conceder master a conta existente da Lume e remover esse master de teste.
5. Testar e-mail duplicado, senha divergente/fraca, conta não confirmada e conta de outra empresa. Repetir vínculo não deve alterar a senha ou reativar usuário comum inativo.
6. Conferir falta da chave administrativa, falta da nova RPC e falha de vínculo após criação. As mensagens devem permitir recuperar a operação sem recriar conta.
7. Abrir um link antigo de convite e `/cadastro`: não devem cadastrar nem conceder acesso. Conferir recuperação de senha, inclusive link emitido antes desta mudança.
8. Conferir layout em celular e teclado. Os formulários bloqueiam envio e mudança de modo durante a operação.

Revisão estática realizada; SQL, Auth remoto, lint, build, servidor e testes reais **não executados pelo agente**. A implementação ainda não está homologada. Tipos da nova RPC foram declarados manualmente no repositório.
