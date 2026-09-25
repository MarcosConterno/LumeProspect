# Lume Prospect

Atualização da administração: painel master em /lume, clientes com módulos liberados pela Lume e usuário comum vinculado a uma única empresa. Consulte [estado da implementação e migrations já aplicadas](docs/specs/lume-administration-plan.md). A partir de agora, todo SQL no Supabase e todos os comandos npm são executados pelo usuário.

Sistema em construção para administração, CRM e financeiro de empresas, com prospecção prevista para a última etapa.

## Ordem de trabalho

1. Organização da base técnica e dos cadastros.
2. Administração: empresa, conta, equipe e permissões.
3. CRM: empresas atendidas, contatos, serviços e negócios.
4. Financeiro e sua integração com negócios fechados.
5. Prospects, busca, qualificação e automações de prospecção.

O diagnóstico e os critérios de conclusão estão em [docs/specs/project-audit-2026-09-14.md](docs/specs/project-audit-2026-09-14.md).

## Estado atual

Última entrega (16/09/2026): [configurações centralizadas e tela única de Usuários](docs/specs/central-settings-users.md). Master escolhe qualquer empresa; administrador e gerente veem somente a própria. Clientes e ambientes permite entrar nos dados de cada empresa. Nova migration para gerentes, lint, build e homologação aguardam execução pelo usuário.

| Área | Situação |
| --- | --- |
| Login, seleção de empresa e equipe | Conectados ao Supabase; login confirmado anteriormente. Autocadastro retirado da aplicação |
| Confirmação e recuperação por e-mail | Fluxos escritos; configuração e teste completo de entrega ainda precisam ser validados |
| Usuários e masters | Cadastro direto escrito; convites removidos da interface. Migration de bloqueio dos convites e novas permissões pendente |
| Perfil, dados empresariais e cadastros comerciais | Interface e banco implementados; lint, build e homologação visual pendentes |
| Tela CRM | Protótipo com mocks e alterações em memória |
| Camada de dados do CRM | Em implementação; ações e repositório escritos, ainda sem conexão com a tela |
| Notas e arquivos | Tabelas e bucket privado criados online; interface e testes de upload real pendentes |
| Financeiro | Dados reais; busca por período, cliente, categoria e valor e relatório para PDF escritos. [Nova migration e validação pendentes](docs/specs/finance-search-reports.md) |
| Agenda | Página de estrutura inicial |
| Dashboard | Contagens reais de cadastros e equipe |
| Prospects | Demonstração; desenvolvimento adiado |

## Stack e estrutura

Next.js App Router, React, TypeScript, Tailwind CSS, Supabase e npm. Vercel é o destino futuro de publicação.

- `src/app`: páginas e endpoints.
- `src/features/auth`: sessão, empresa ativa e gestão de equipe.
- `src/features/administration`: perfil, dados empresariais e cadastros de empresas, contatos e serviços.
- `src/features/crm`: contratos, validação, camada de dados, ações, componentes e mocks comerciais.
- `src/features/prospects`: demonstrações de prospecção; última etapa do produto.
- `src/components`: layout e UI compartilhada.
- `src/lib/supabase`: clientes browser/SSR com chave publicável e cliente Auth Admin exclusivo do servidor para cadastro autorizado de usuários.
- `src/types/database.ts`: tipos do banco online com declarações manuais das RPCs novas.
- `supabase/migrations`: histórico SQL e migrations pendentes identificadas nas especificações de cada entrega.
- `supabase/tests`: testes SQL transacionais, com rollback.

## Ambiente

O banco é exclusivamente o Supabase online do projeto LumeProspect. Não é necessário iniciar banco local ou Docker. Os arquivos de migration registram alterações; não são uma instância local do banco.

As variáveis esperadas estão no `.env.example`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Credenciais reais ficam em `.env.local`, que não deve ser versionado. Não colocar chaves secretas ou service role em variáveis `NEXT_PUBLIC_`.

Configuração dos links de autenticação e SMTP: [docs/specs/auth-workspaces.md](docs/specs/auth-workspaces.md).

## Execução e validação

O usuário executa comandos de instalação, desenvolvimento, lint e build, além de todo SQL no Supabase online, e compartilha os resultados. O agente lê e edita arquivos.

```bash
npm run dev
```

Para validar alterações, executar separadamente:

```bash
npm run lint
npm run build
```

Não considerar a camada nova do CRM validada com base nos checks de entregas anteriores. A revisão de 14/09/2026 não executou npm, lint, build nem iniciou servidor.

## Documentação

- [Administração: implementação e roteiro de homologação](docs/specs/administration-master-records.md)
- [Diagnóstico e sequência de entrega](docs/specs/project-audit-2026-09-14.md)
- [Autenticação, empresas e convites](docs/specs/auth-workspaces.md)
- [Isolamento por empresa](docs/specs/workspace-security.md)
- [Estado do pipeline](docs/specs/crm-pipeline.md)
- [Referência visual](docs/reference/ai-prospect-redesign.html)

A referência visual orienta a aparência, mas a prioridade vigente é administração, CRM e financeiro antes de prospects.
