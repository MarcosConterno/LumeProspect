import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const db = createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies) {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await db.auth.getUser();
  const protectedRoute = /^\/(lume|dashboard|clientes|contatos|perfil|crm|equipe|prospects|buscar|agenda|favoritos|financeiro|servicos|configuracoes|onboarding|redefinir-senha)(\/|$)/.test(request.nextUrl.pathname);
  if (!user && protectedRoute) {
    const destination = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.getAll().forEach((cookie) => destination.cookies.set(cookie));
    destination.headers.set("Cache-Control", "private, no-store");
    return destination;
  }
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "same-origin");
  return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
