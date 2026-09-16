# Login, convites e acesso master — 15/09/2026

## Retomada em 16/09/2026

A revisão dos registros identificou esta entrega como o ponto mais recente de continuidade, após a criação de usuários pelo master. Administração e financeiro têm implementação; a interface do CRM permanece demonstrativa. A execução da migration de preview abaixo e a homologação não estão confirmadas nos registros disponíveis.

Corrigida a preservação do convite na recuperação de senha: `/auth/confirm` mantinha o token quando o destino já era redefinição, mas o descartava ao converter um destino de convite para redefinição. A extração agora usa os destinos internos permitidos e é compartilhada com o callback. A criação do link de recuperação usa o mesmo construtor de destino.

Ao abrir `/redefinir-senha` sem sessão, o proxy agora encaminha à orientação de recuperação, preservando o convite válido. Antes, levava ao login sem o token. Não há SQL novo nesta retomada.

Validação pendente pelo usuário:

1. Executar `npm run lint` e `npm run build` e compartilhar os resultados atuais.
2. Abrir convite, solicitar recuperação, seguir o e-mail, salvar a senha e entrar: deve voltar ao convite para aceite explícito.
3. Abrir `/redefinir-senha?invite=<token válido>` em janela sem sessão: a orientação deve oferecer novo link de recuperação mantendo o convite.
4. Conferir confirmação por `/auth/confirm` com `type=recovery` e destino de convite: sucesso deve levar à redefinição com o token; erro deve manter o convite na opção de solicitar outro link.
5. Conferir recuperação sem convite e com token inválido, além de destinos externos em `next`: nunca redirecionar para endereço externo nem aceitar convite automaticamente.

Revisão estática apenas. Não foram executados comandos npm, servidor, SQL ou testes de autenticação pelo agente. Referência de sessão: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

## Regra confirmada pelo usuário

Master Lume acessa todas as empresas e todos os módulos. Não possui restrição individual de módulos. Administrador é um papel da empresa e não concede acesso master. A configuração de módulos das empresas foi mantida.

## Problemas identificados e ajustes

- Convites eram links manuais, mas a experiência sugeria envio de e-mail. Agora o botão e o resultado dizem explicitamente que não há envio automático. Há opções para copiar o link e abrir uma mensagem no aplicativo de e-mail do operador; o operador precisa enviá-la.
- Criar conta e entrar não aceitam convite. A página de convite agora consulta o papel real no servidor, mostra Master/Administrador/Usuário e exige aceite explícito.
- Aceitar convite master agora redireciona para `/lume`. Antes, o fluxo selecionava a empresa e ia ao dashboard, embora o registro privado de master já pudesse ter sido concedido.
- Trocar de conta preserva o convite no retorno do login.
- Convite já aceito permite entrar novamente pelo roteamento que verifica o acesso atual; o papel do convite antigo não é usado para autorizar a conta.
- O menu do painel master mostra os módulos. O cabeçalho identifica a empresa atual e oferece Trocar empresa. Os dados de cada módulo continuam delimitados pela empresa selecionada; o master pode entrar em qualquer empresa.
- A página Masters mostra os convites e seus estados e explica as três etapas: conta, convite master, aceite. Contas criadas na empresa interna Lume podem aceitar; contas ligadas a outro cliente não são transferidas automaticamente.

## SQL novo — pendente

1. Executar `supabase/migrations/20260915180000_invitation_access_preview.sql` uma vez. Depende da administração existente. Adiciona somente leitura autenticada de convite do próprio e-mail confirmado; não altera contas ou concede acesso.
2. Executar `supabase/tests/invitation-access-preview.sql` inteiro. Esperado PASS e ROLLBACK. Testa isolamento, anonimato, distinção entre visualizar/aceitar, concessão master e acesso a módulo.
3. Executar `npm run lint` e `npm run build` e compartilhar resultados.

Nenhuma migration anterior deve ser reaplicada. SQL, testes, lint, build e servidor não foram executados pelo agente. Esta entrega foi revisada estaticamente e não está homologada.

## Conferência no navegador

1. Como master atual, gerar link master para a conta desejada. Conferir que ela pertence à empresa interna Lume ou não tem empresa.
2. Em janela privada, abrir o link e entrar com o e-mail convidado. Conferir o título Master Lume e clicar em Aceitar acesso master Lume.
3. Conferir redirecionamento para `/lume`, presença na lista Masters e estado Aceito no convite.
4. Trocar entre duas empresas e conferir CRM/Financeiro e nome da empresa no cabeçalho. Módulos ficam disponíveis ao master mesmo quando desabilitados no plano da empresa.
5. Conferir conta errada, link inválido/revogado, link já aceito e Sair e entrar com outra conta (deve preservar convite).
6. Conferir que administrador comum não ganhou acesso master nem acesso aos módulos bloqueados.

Não foi confirmado o papel remoto da conta relatada pelo usuário. O novo fluxo permite distinguir convite pendente de acesso concedido. Nenhum usuário real foi promovido pelo agente.
