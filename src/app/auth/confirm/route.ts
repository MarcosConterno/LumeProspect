import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authDestination, inviteFromDestination, recoveryDestination } from "@/features/auth/links";

export async function GET(request:NextRequest) {
  const params=request.nextUrl.searchParams;
  const type=params.get("type");
  let next=authDestination(params.get("next"));
  const redirectTo=params.get("redirect_to");
  if(redirectTo) {
    try {
      const callback=new URL(redirectTo);
      if(callback.origin===request.nextUrl.origin && callback.pathname==="/auth/callback") next=authDestination(callback.searchParams.get("next"));
    } catch { /* Invalid destinations fall back to onboarding. */ }
  }
  const invite = inviteFromDestination(next);
  if(type==="recovery") next=recoveryDestination(invite);
  const hash=params.get("token_hash");
  let reason="invalid_link";
  if(hash && /^[a-f0-9]{32,128}$/i.test(hash) && (type==="email" || type==="recovery" || type==="invite")) {
    const db=await createClient();
    const {error}=await db.auth.verifyOtp({token_hash:hash,type});
    if(!error) return NextResponse.redirect(new URL(next,request.url));
    reason=error.code==="otp_expired" ? "expired" : "exchange_failed";
  }
  const failure=new URL("/auth/link-error",request.url);
  failure.searchParams.set("reason",reason);
  if(type==="recovery") failure.searchParams.set("flow","recovery");
  if(invite) failure.searchParams.set("invite",invite);
  return NextResponse.redirect(failure);
}
