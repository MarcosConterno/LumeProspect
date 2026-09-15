# Login, empresas e equipe

Implementação de 14/09/2026. Esta etapa conecta autenticação, empresas assinantes e equipes. Os módulos comerciais ainda usam exemplos identificados na interface; a integração de negócios, atividades, notas e anexos é a próxima etapa.

## Fluxos

- `/cadastro`: cria uma conta pessoal com Supabase Auth. A confirmação do e-mail precede a criação de empresa e aceitação de convite.
- `/login`: autentica com e-mail e senha. Não revela se uma conta existe em caso de credenciais inválidas.
- `/recuperar-senha`: solicita e-mail de recuperação; `/redefinir-senha` altera a senha da conta autenticada.
- `/auth/callback`: troca o código PKCE por sessão. Somente onboarding e redefinição de senha são destinos permitidos.
- `/onboarding`: permite cadastrar uma empresa ou escolher entre associações existentes. A criação grava perfil, empresa e associação do proprietário numa transação.
- `/equipe`: nome da empresa, pessoas e permissões, criação e revogação de convites. Links são gerados para compartilhamento manual; a aplicação não envia e-mails de convite.
- `/convite/[token]`: exige login, e-mail confirmado e correspondente ao convite antes de associar a pessoa. O visitante sem login não recebe dados da empresa.

## Relacionamentos e segurança

Uma identidade Auth possui um perfil e pode ter várias associações em `workspace_members`. Empresas assinantes estão em `workspaces`; empresas prospectadas estão em `companies`.

O cookie `lume-workspace` guarda apenas a escolha da empresa. A associação vigente e o status ativo são verificados no servidor e por RLS. O cookie não concede acesso. As mutações validam a sessão novamente; não utilizam service role.

O proprietário pode convidar administradores e membros, alterar permissões de outros usuários e remover usuários que não sejam proprietários. Administradores convidam e removem membros. Membros não gerenciam a equipe. Negócios atribuídos impedem a remoção do responsável até serem transferidos.

Convites duram 7 dias. O servidor gera 32 bytes aleatórios e o banco armazena somente SHA-256 do token. A aceitação bloqueia a linha, valida expiração, revogação, e-mail confirmado em `auth.users`, status da empresa e permissão vigente do criador. Reutilização é negada. Convites não promovem associações existentes. Revogar um convite aceito não remove a pessoa; use a gestão de membros.

As funções privilegiadas ficam no schema privado, com `search_path` fixo e validação de identidade/permissão. Wrappers públicos são security invoker, com execução restrita a authenticated. Metadados editáveis servem somente ao nome de exibição, nunca à autorização.

## Configuração de e-mail e publicação

Defina `NEXT_PUBLIC_SITE_URL` com a origem real do app. Em desenvolvimento, na ausência da variável, são aceitos apenas hosts localhost/127.0.0.1.

No Supabase Auth, configure a Site URL e a lista de URLs de redirecionamento para incluir a origem do app e `/auth/callback`, inclusive `/auth/callback?next=/redefinir-senha`. Inclua a porta usada localmente. Mantenha confirmação de e-mail habilitada e configure SMTP para entrega aos clientes em produção. Não foram alterados SMTP, templates nem configurações remotas de redirecionamento nesta etapa.

O fluxo padrão PKCE deve ser aberto no mesmo navegador em que o cadastro ou a recuperação começou. Depois de confirmar uma conta criada a partir de convite, reabra o link do convite. Links inválidos/expirados levam a uma mensagem de erro com orientação.

## Verificação

`supabase/tests/auth-invitations.sql` verifica criação do proprietário, aceitação, e-mail incorreto, segredo não exposto, reutilização, convites revogados/expirados, criador rebaixado, isolamento entre empresas, acesso anônimo, autoelevação de papel e empresa suspensa. Executar o arquivo inteiro: todos os dados são temporários e terminam em ROLLBACK.

`supabase/tests/workspace-isolation.sql` preserva a cobertura do domínio comercial. Na revisão de 14/09/2026, o advisor apontou a observação intencional da tabela privada `platform_admins` sem políticas e proteção contra senhas vazadas desabilitada no Auth. O último item precisa ser tratado na configuração de autenticação antes da produção.

Testes de envio e recebimento real dos e-mails dependem da configuração de Auth/SMTP e de uma caixa postal de teste autorizada.

Lint e build passaram em 14/09/2026. No navegador local foram verificados login com conta temporária, cadastro de empresa, geração e aceitação de convite, preservação do papel de proprietário, saída e redirecionamento de rota protegida. Login e equipe foram inspecionados visualmente em desktop e mobile. Os registros temporários foram removidos ao final; nenhum e-mail foi enviado.
