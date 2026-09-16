# Contas de acesso criadas pelo master — retomada em 15/09/2026

> Continuidade: [login, convites e acesso master](login-master-invitations.md). Inclui migration nova pendente para mostrar o papel do convite antes do aceite e ajustes de navegação master.

## Onde o trabalho havia parado

O usuário confirmou que a tarefa interrompida era a criação de contas pelo master. Já existiam `user-actions.ts`, o cliente Auth Admin exclusivo do servidor e a migration `20260915160000_master_user_assignment.sql`, mas a ação não era chamada por nenhuma tela.

## Continuidade implementada

Na lista `/lume`, cada empresa tem o botão **Criar usuário**, que abre `/lume/clientes/[id]/usuarios`. A configuração da empresa também oferece esse atalho. A página própria mostra a empresa escolhida e o formulário de novo usuário aberto, com **Já possui conta** como alternativa e convites recolhidos ao final. O formulário permite:

- Criar conta com nome, e-mail, senha inicial e perfil Usuário/Administrador, vinculando-a à empresa.
- Vincular conta existente com e-mail confirmado, preservando sua senha.
- Exibir erros e confirmação da ação; impedir troca de operação durante o envio.
- Exibir o evento de vínculo no histórico administrativo com descrição legível.

A autorização continua no servidor e na RPC: somente master, empresa ativa, proteção das contas master e impedimento de vínculo com outra empresa. Repetir um vínculo existente não altera perfil, permissões nem reativa pessoa inativa. Se a conta for criada mas o vínculo falhar, a mensagem orienta usar Vincular conta existente após resolver a causa. Não se apaga a conta para compensar essa falha.

A criação usa `email_confirm: true`, como já previsto na ação: o usuário entra com a senha inicial, sem envio de e-mail. Não há troca obrigatória de senha no primeiro acesso implementada nesta entrega. Convites continuam disponíveis na opção recolhida ao final da página de criação.

Referência: [Supabase Auth Admin createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser). O cliente administrativo permanece `server-only`; nenhuma chave é passada ao componente visual, somente um booleano de disponibilidade.

## Configuração e estado do SQL

- Para criar contas, configurar `SUPABASE_SECRET_KEY` no servidor (`.env.local` no desenvolvimento), conforme `.env.example`. Também há compatibilidade com `SUPABASE_SERVICE_ROLE_KEY`. Nunca usar prefixo `NEXT_PUBLIC_` nessas chaves nem compartilhá-las no chat.
- Após alterar o ambiente, o usuário reinicia o servidor. Sem chave, a criação fica desabilitada; vínculo existente e convites permanecem disponíveis.
- O usuário informou que, a princípio, todas as migrations foram executadas. Não reaplicar `20260915160000_master_user_assignment.sql`; esta continuidade não cria nem altera SQL. A aplicação online não foi inspecionada pelo agente.

## Próximo passo: validação pelo usuário

Implementação revisada estaticamente; ainda sem lint, build ou teste real de criação/login desta entrega.

1. Executar `npm run lint` e `npm run build` e compartilhar os resultados.
2. Entrar como master e clicar em Criar usuário no cartão de uma empresa. Conferir o nome da empresa, formulário visível, alternativa Já possui conta e convite recolhido. Repetir em tela de celular. Sem chave administrativa, o formulário permanece visível com aviso e envio desabilitado.
3. Criar uma conta de teste como Usuário. Em janela privada, entrar com o novo e-mail e senha; conferir empresa correta e módulos/permissões. Conferir a pessoa em Equipe e o evento no histórico.
4. Criar outra conta como Administrador e conferir gestão da equipe.
5. Vincular conta confirmada sem empresa. Repetir vínculo e conferir preservação do perfil e permissões. Conferir rejeição de conta de outra empresa, conta master e conta sem confirmação.
6. Conferir senha divergente, senha fraca e e-mail já cadastrado. Conta existente deve manter sua senha.
7. Conferir que um usuário comum não acessa o painel master e que empresa suspensa não permite criação/vínculo.

Não foram executados npm, servidor, SQL, criação de contas ou envio de e-mails pelo agente. Se houver nova interrupção, retomar por este arquivo e pelos resultados que o usuário enviar, sem tratar a revisão estática como homologação.
