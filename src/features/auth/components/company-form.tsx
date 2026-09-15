"use client";
import { useActionState } from "react";
import { createWorkspace } from "../actions";
export function CompanyForm() {
  const [state, action, pending] = useActionState(createWorkspace, {});
  return <form action={action} className="space-y-4 rounded-xl border border-border bg-surface p-6"><h2 className="font-display text-xl">Cadastrar uma empresa</h2><p className="text-sm text-[var(--ink-soft)]">Você será o proprietário deste espaço e poderá convidar sua equipe. Se recebeu um convite, abra o link para entrar na empresa existente.</p><label className="block text-sm">Nome da empresa<input name="name" required minLength={2} maxLength={160} className="crm-input" autoComplete="organization" /></label>{state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}<button disabled={pending} className="rounded-lg bg-accent px-4 py-2 text-white disabled:opacity-50">{pending ? "Criando…" : "Criar empresa"}</button></form>;
}
