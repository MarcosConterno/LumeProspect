"use client";
import { useActionState } from "react";
import Link from "next/link";
import { Brand } from "@/components/ui/brand";
import { authenticate } from "../actions";
import { validInvite } from "../links";
const titles = { login: "Entrar na sua conta", signup: "Criar sua conta", recover: "Recuperar acesso", password: "Definir nova senha", resend:"Reenviar confirmação" };
export function AuthForm({ mode, invite = "", notice }: { mode: keyof typeof titles; invite?: string; notice?: string }) {
  const [state, action, pending] = useActionState(authenticate.bind(null, mode), {});
  const token=validInvite(invite);
  const suffix = token ? `?invite=${token}` : "";
  return <section className="auth-content w-full max-w-md space-y-6">
    <div><div className="mb-7 flex justify-center"><Brand href="/login" large /></div><h1 className="font-display text-3xl">{titles[mode]}</h1><p className="mt-3 text-sm text-[var(--ink-soft)]">{mode === "signup" ? "Seu acesso é pessoal. Depois de confirmar o e-mail, aceite o convite enviado pela Lume ou pelo administrador da sua empresa." : mode === "recover" ? "Enviaremos as instruções para o e-mail da sua conta." : mode === "resend" ? "Informe o e-mail usado no cadastro para solicitar um novo link de confirmação." : "Acesse sua empresa e acompanhe sua operação comercial."}</p></div>
    {notice && <p role="status" className="rounded-lg bg-[var(--accent-soft)] p-3 text-sm">{notice}</p>}
    <form action={action} className="space-y-4 rounded-xl border border-border bg-surface p-6">
      <input type="hidden" name="invite" value={token} />
      {mode === "signup" && <label className="block text-sm">Seu nome<input name="name" autoComplete="name" required minLength={2} maxLength={120} className="crm-input" /></label>}
      {mode !== "password" && <label className="block text-sm">E-mail<input name="email" type="email" autoComplete="email" required maxLength={254} className="crm-input" /></label>}
      {mode !== "recover" && mode !== "resend" && <label className="block text-sm">Senha<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "login" ? 1 : 8} maxLength={128} className="crm-input" />{mode !== "login" && <span className="mt-1 block text-xs text-[var(--ink-soft)]">Pelo menos 8 caracteres.</span>}</label>}
      {mode === "password" && <label className="block text-sm">Confirme a senha<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} className="crm-input" /></label>}
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}{state.message && <p role="status" className="text-sm text-accent-dark">{state.message}</p>}
      <button disabled={pending} className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Aguarde…" : mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : mode === "recover" ? "Enviar link de recuperação" : mode === "resend" ? "Reenviar confirmação" : "Salvar nova senha"}</button>
      {mode === "login" && <Link href={"/recuperar-senha"+suffix} className="block text-center text-sm text-accent-dark">Esqueci minha senha</Link>}
      {(mode === "login" || mode === "signup") && <Link href={"/reenviar-confirmacao"+suffix} className="block text-center text-sm text-accent-dark">Não recebi o e-mail de confirmação</Link>}
    </form>
    <p className="text-center text-sm"><Link className="text-accent-dark" href={mode === "login" ? `/cadastro${suffix}` : `/login${suffix}`}>{mode === "login" ? "Ainda não tem conta? Cadastre-se" : "Voltar para entrar"}</Link></p>
  </section>;
}
