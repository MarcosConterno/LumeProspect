# Orientações para agentes

## Stack

- Next.js atual com App Router e TypeScript
- Tailwind CSS 4 e ESLint
- npm como gerenciador de pacotes
- Supabase preparado para autenticação, banco PostgreSQL e sessões SSR
- Vercel como destino futuro de publicação

## Arquitetura

- `src/app`: rotas, layouts e páginas do App Router
- `src/components`: componentes reutilizáveis de layout e UI
- `src/features`: módulos por domínio do produto
- `src/lib/supabase`: clientes browser e server do Supabase
- `src/types`: contratos TypeScript compartilhados
- `docs/reference/ai-prospect-redesign.html`: referência visual e funcional principal
- `supabase/migrations`: futuras mudanças versionadas do banco

## Prioridade vigente do produto

- Organizar a base e os cadastros antes de ampliar funcionalidades.
- Ordem: administração, CRM, financeiro e integração comercial/financeira. Prospects, busca e automações de prospecção ficam por último.
- CRM deve funcionar com cadastro manual de empresas e contatos, sem depender do módulo de prospects.
- Distinguir empresa assinante (`workspaces`), empresa atendida (`companies`) e administração da plataforma Lume.
- Consultar `docs/specs/project-audit-2026-09-14.md` para o inventário atual e as pendências. A referência HTML orienta a aparência, não altera essa ordem de trabalho.
- Banco exclusivamente no Supabase online. Migrations no repositório são histórico das alterações, não uma exigência de banco local ou Docker.
- A partir de agora, o usuário executa TODO SQL no Supabase. O agente prepara os arquivos e informa a ordem; não chama ferramentas do Supabase. Distinguir migrations já aplicadas das pendentes para evitar duplicação.

## Regras

- Trate o HTML de referência como especificação, não como código para copiar diretamente para JSX.
- Prefira componentes reutilizáveis e páginas Server Components por padrão.
- Use Client Components somente quando houver estado ou interatividade dependente do navegador.
- Não coloque acesso direto ao banco dentro de componentes visuais.
- Nunca exponha secrets, service role keys ou credenciais no frontend.
- Faça mudanças no banco somente por migrations.
- Mantenha mocks separados da camada de acesso a dados até a integração com Supabase.
- O usuário executa os comandos operacionais de terminal, incluindo npm, instalações, lint, build e servidores, além do SQL no Supabase, e compartilha os resultados. O agente lê e edita arquivos.
- Solicite ao usuário os resultados de `npm run lint` e `npm run build` antes de considerar uma implementação validada. Não reutilize checks de uma entrega anterior para declarar código novo aprovado.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
