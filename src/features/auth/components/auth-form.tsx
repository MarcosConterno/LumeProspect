"use client";
import { useActionState } from "react";
import Link from "next/link";
import { Brand } from "@/components/ui/brand";
import { authenticate } from "../actions";

const titles = { login: "Entrar na sua conta", recover: "Recuperar acesso", password: "Definir nova senha", resend: "Reenviar confirmação" };

export function AuthForm({ mode, notice }: { mode: keyof typeof titles; notice?: string }) {
  const [state, action, pending] = useActionState(authenticate.bind(null, mode), {});
  return <section className="auth-content w-full max-w-md space-y-6">
    <div>
      <div className="mb-7 flex justify-center"><Brand href="/login" large /></div>
      <h1 className="font-display text-3xl">{titles[mode]}</h1>
      <p className="mt-3 text-sm text-[var(--ink-soft)]">{mode === "recover" ? "Enviaremos as instruções para o e-mail da sua conta." : mode === "resend" ? "Solicite outro link se sua conta anterior ainda aguarda confirmação de e-mail." : mode === "password" ? "Defina a nova senha da sua conta." : "Entre com o e-mail e a senha cadastrados pelo administrador."}</p>
    </div>
    {notice && <p role="status" className="rounded-lg bg-[var(--accent-soft)] p-3 text-sm">{notice}</p>}
    <form action={action} className="space-y-4 rounded-xl border border-border bg-surface p-6">
      {mode !== "password" && <label className="block text-sm">E-mail<input name="email" type="email" autoComplete="email" required maxLength={254} className="crm-input" /></label>}
      {(mode === "login" || mode === "password") && <label className="block text-sm">Senha<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "login" ? 1 : 8} maxLength={128} className="crm-input" />{mode === "password" && <span className="mt-1 block text-xs text-[var(--ink-soft)]">Pelo menos 8 caracteres.</span>}</label>}
      {mode === "password" && <label className="block text-sm">Confirme a senha<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} className="crm-input" /></label>}
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state.message && <p role="status" className="text-sm text-accent-dark">{state.message}</p>}
      <button disabled={pending} className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Aguarde…" : mode === "login" ? "Entrar" : mode === "recover" ? "Enviar link de recuperação" : mode === "resend" ? "Reenviar confirmação" : "Salvar nova senha"}</button>
      {mode === "login" && <Link href="/recuperar-senha" className="block text-center text-sm text-accent-dark">Esqueci minha senha</Link>}
      {mode === "login" && state.error && <Link href="/reenviar-confirmacao" className="block text-center text-sm text-accent-dark">Minha conta anterior precisa confirmar o e-mail</Link>}
    </form>
    {mode === "login" ? <p className="text-center text-sm">Ainda não tem acesso? Solicite seu cadastro ao administrador da empresa.</p> : <p className="text-center text-sm"><Link className="text-accent-dark" href="/login">Voltar para entrar</Link></p>}
  </section>;
}
