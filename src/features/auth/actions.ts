"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "./context";
import { authErrorMessage } from "./errors";
export type ActionState = { error?: string; message?: string };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
async function origin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return new URL(process.env.NEXT_PUBLIC_SITE_URL).origin;
  const host = (await headers()).get("host");
  if (host && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return `http://${host}`;
  throw new Error("Configure NEXT_PUBLIC_SITE_URL para habilitar os e-mails de autenticação.");
}
export async function authenticate(mode: string, _previous: ActionState, form: FormData): Promise<ActionState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!["login", "recover", "resend", "password"].includes(mode)) return { error: "O cadastro é realizado pelo administrador da empresa." };
  const db = await createClient();
  if (mode !== "password" && !emailPattern.test(email)) return { error: "Informe um e-mail válido." };
  if (!["recover","resend"].includes(mode) && (password.length < (mode === "login" ? 1 : 8) || password.length > 128)) return { error: "Use uma senha com 8 a 128 caracteres." };
  if (mode === "login") {
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) return { error: error.code === "email_not_confirmed" ? "Confirme seu e-mail antes de entrar." : "Não foi possível entrar. Confira o e-mail e a senha e tente novamente." };
  } else if (mode === "resend") {
    let site:string;
    try {site=await origin();} catch(error) {return {error:(error as Error).message};}
    const callback=new URL("/auth/callback",site);
    callback.searchParams.set("next","/onboarding");
    const {error}=await db.auth.resend({type:"signup",email,options:{emailRedirectTo:callback.href}});
    if(error) return {error:authErrorMessage(error,"Não foi possível reenviar a confirmação agora. Aguarde e tente novamente.")};
    return {message:"Se este cadastro aguarda confirmação, você receberá um novo e-mail. Confira também o spam."};
  } else if (mode === "recover") {
    let site: string;
    try { site = await origin(); } catch (e) { return { error: (e as Error).message }; }
    const callback=new URL("/auth/callback",site);
    callback.searchParams.set("next","/redefinir-senha");
    const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: callback.href });
    if (error) return { error: authErrorMessage(error,"Não foi possível solicitar a recuperação agora. Tente novamente em alguns minutos.") };
    return { message: "Se houver uma conta com esse e-mail, você receberá um link para redefinir sua senha." };
  } else if (mode === "password") {
    await requireUser();
    if (password !== form.get("confirmPassword")) return { error: "As senhas não coincidem." };
    const { error } = await db.auth.updateUser({ password });
    if (error) return { error: "Não foi possível alterar a senha. Solicite um novo link ou escolha outra senha." };
    const result = await db.auth.signOut();
    if (result.error) return { message: "Senha alterada. Saia da conta e entre novamente." };
    redirect("/login?updated=1");
  } else return { error: "Operação inválida." };
  redirect("/onboarding");
}
export async function signOut() {
  const db = await createClient();
  const { error } = await db.auth.signOut();
  if (error) throw new Error("Não foi possível sair. Tente novamente.");
  (await cookies()).delete("lume-workspace");
  redirect("/login");
}
export async function selectWorkspace(form: FormData) {
  const { db,user }=await requireUser();
  const id=String(form.get("workspace") ?? "");
  if(!/^[a-f0-9-]{36}$/i.test(id)) redirect("/onboarding");
  const master=await db.rpc("is_lume_master");
  if(master.error) throw new Error("Não foi possível verificar seu acesso.");
  if(master.data) {
    const result=await db.rpc("platform_manage",{operation:"enter_client",target:id,payload:{}});
    if(result.error) throw new Error("Não foi possível acessar este ambiente.");
  } else {
    const result=await db.from("workspace_members").select("workspace_id,workspaces(id)").eq("workspace_id",id).eq("user_id",user.id).eq("active",true).single();
    if(result.error||!result.data?.workspaces) redirect("/onboarding");
  }
  (await cookies()).set("lume-workspace",id,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:60*60*24*365});
  const destination = form.get("destination");
  redirect(destination === "/configuracoes/empresa" ? destination : "/dashboard");
}

export async function returnToLume() {
  const { db } = await requireUser();
  const master = await db.rpc("is_lume_master");
  if (master.error) throw new Error("Não foi possível verificar seu acesso.");
  if (!master.data) redirect("/dashboard");
  const result = await db.from("workspaces").select("id").eq("is_lume", true).single();
  if (result.error || !result.data) throw new Error("A base administrativa da Lume não está disponível.");
  (await cookies()).set("lume-workspace", result.data.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/lume");
}
