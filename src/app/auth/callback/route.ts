import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authDestination } from "@/features/auth/links";
export async function GET(request: NextRequest) {
  const db = await createClient();
  const next=authDestination(request.nextUrl.searchParams.get("next"));
  const recovery = next.startsWith("/redefinir-senha");
  const code = request.nextUrl.searchParams.get("code");
  let reason = "missing_code";
  if (code) {
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
    reason = error.code === "otp_expired" ? "expired" : "exchange_failed";
  }
  const errorUrl = new URL("/auth/link-error", request.url);
  errorUrl.searchParams.set("reason", reason);
  if (recovery) errorUrl.searchParams.set("flow", "recovery");
  if(next.startsWith("/convite/")) errorUrl.searchParams.set("invite",next.slice("/convite/".length));
  if(recovery) {
    const invite=new URL(next,request.url).searchParams.get("invite");
    if(invite) errorUrl.searchParams.set("invite",invite);
  }
  return NextResponse.redirect(errorUrl);
}
