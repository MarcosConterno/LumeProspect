import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function GET(request: NextRequest) {
  const db = await createClient();
  const recovery = request.nextUrl.searchParams.get("next") === "/redefinir-senha";
  const code = request.nextUrl.searchParams.get("code");
  let reason = "missing_code";
  if (code) {
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) {
      const next = recovery ? "/redefinir-senha" : "/onboarding";
      return NextResponse.redirect(new URL(next, request.url));
    }
    reason = error.code === "otp_expired" ? "expired" : "exchange_failed";
  }
  // An already authenticated account can continue without reusing the email code.
  // Recovery failures must still offer a fresh recovery flow, never imply success.
  const { data: { user } } = await db.auth.getUser();
  if (!recovery && user?.email_confirmed_at) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }
  const errorUrl = new URL("/auth/link-error", request.url);
  errorUrl.searchParams.set("reason", reason);
  if (recovery) errorUrl.searchParams.set("flow", "recovery");
  return NextResponse.redirect(errorUrl);
}
