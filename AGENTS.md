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

## Regras

- Trate o HTML de referência como especificação, não como código para copiar diretamente para JSX.
- Prefira componentes reutilizáveis e páginas Server Components por padrão.
- Use Client Components somente quando houver estado ou interatividade dependente do navegador.
- Não coloque acesso direto ao banco dentro de componentes visuais.
- Nunca exponha secrets, service role keys ou credenciais no frontend.
- Faça mudanças no banco somente por migrations.
- Mantenha mocks separados da camada de acesso a dados até a integração com Supabase.
- Execute `npm run lint` e `npm run build` antes de considerar uma tarefa concluída.
