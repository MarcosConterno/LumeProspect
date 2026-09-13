<<<<<<< HEAD
# LumeProspect
=======
# Lume Prospect

Fundação arquitetural de uma plataforma de prospecção B2B inteligente. O produto ajudará equipes comerciais a encontrar, priorizar e acompanhar prospects com contexto e automação.

## Stack

- Next.js com App Router
- TypeScript
- Tailwind CSS 4
- ESLint
- Supabase SSR e Supabase JS
- npm
- Vercel como destino futuro de publicação

## Desenvolvimento

```bash
npm install
npm run dev
```

A aplicação fica disponível em `http://localhost:3000`.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha as variáveis de um projeto Supabase quando ele existir:

```bash
cp .env.example .env.local
```

São esperadas apenas `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Não use service role key ou qualquer secret no frontend.

## Estrutura principal

- `src/app/(auth)`: login e cadastro
- `src/app/onboarding`: configuração inicial do perfil ideal de cliente
- `src/app/(app)`: shell autenticado e rotas do produto
- `src/components/layout`: sidebar, header mobile e shell
- `src/components/ui`: componentes visuais reutilizáveis
- `src/features`: módulos por domínio
- `src/lib/supabase`: clientes Supabase browser/server
- `src/types`: tipos compartilhados
- `supabase/migrations`: futuras migrations do banco

As telas estão representadas por placeholders nesta etapa. Nenhuma rota consulta o banco.

## Referência visual

O arquivo [docs/reference/ai-prospect-redesign.html](docs/reference/ai-prospect-redesign.html) é a especificação visual e funcional do produto. O arquivo original recebido em `docs/ai-prospect-redesign.html` também é preservado.

## Checks

Antes de considerar uma tarefa concluída, execute:

```bash
npm run lint
npm run build
```
>>>>>>> 22f06b9 (chore: inicializa Lume Prospect)
