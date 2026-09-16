"use client";
import { useActionState, useState } from "react";
import { createInvite, acceptInvite, manageTeam } from "../team-actions";
import type { ActionState } from "../actions";
const button = "rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50";
function Feedback({ state }: { state: ActionState }) { return <>{state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}{state.message && <p role="status" className="text-sm text-accent-dark">{state.message}</p>}</>; }
export function InviteForm({ owner, workspace }: { owner: boolean; workspace: string }) {
  const [state, action, pending] = useActionState(createInvite, {});
  const [copy, setCopy] = useState("");
  return <form action={action} className="space-y-4 rounded-xl border border-border bg-surface p-5"><input type="hidden" name="workspace" value={workspace} /><h2 className="font-display text-xl">Convidar para a equipe</h2><label className="block text-sm">E-mail do convidado<input type="email" name="email" required maxLength={254} className="crm-input" /></label><label className="block text-sm">Permissão<select name="role" className="crm-input"><option value="member">Membro — operação do CRM</option>{owner && <option value="admin">Administrador — CRM e gestão de membros</option>}</select></label><button disabled={pending} className={button}>{pending ? "Gerando…" : "Gerar convite"}</button><Feedback state={state} />{state.link && <div className="space-y-2"><button type="button" className={button} onClick={async () => { try { await navigator.clipboard.writeText(new URL(state.link!, window.location.origin).href); setCopy("Link copiado."); } catch { setCopy("Não foi possível copiar. Abra o link abaixo e copie o endereço."); } }}>Copiar link do convite</button><a className="block break-all text-sm underline" href={state.link}>Abrir convite</a><p role="status" className="text-xs">{copy}</p></div>}</form>;
}
export function AcceptInviteForm({ token, master=false }: { token: string; master?:boolean }) {
  const [state, action, pending] = useActionState(acceptInvite, {});
  return <form action={action} className="space-y-4"><input type="hidden" name="token" value={token} /><Feedback state={state} /><button disabled={pending} className="rounded-lg bg-accent px-4 py-3 text-white disabled:opacity-50">{pending ? "Confirmando acesso…" : master ? "Aceitar acesso master Lume" : "Aceitar convite e entrar na empresa"}</button></form>;
}
export function TeamOperation({ id, operation, role, workspace }: { workspace: string; id: string; operation: "role" | "remove" | "revoke"; role?: string }) {
  const [state, action, pending] = useActionState(manageTeam, {});
  const [confirming, setConfirming] = useState(false);
  return <form action={action} className="space-y-2"><input type="hidden" name="workspace" value={workspace} /><input type="hidden" name="id" value={id} /><input type="hidden" name="operation" value={operation} /><div className="flex flex-wrap gap-2">{operation === "role" ? <><select aria-label="Permissão do membro" name="role" defaultValue={role} className={button}><option value="member">Membro</option><option value="admin">Administrador</option></select><button disabled={pending} className={button}>Salvar permissão</button></> : confirming ? <><span className="self-center text-xs">Confirmar {operation === "remove" ? "remoção" : "revogação"}?</span><button disabled={pending} className={button}>Confirmar</button><button type="button" onClick={() => setConfirming(false)} className={button}>Cancelar</button></> : <button type="button" onClick={() => setConfirming(true)} className={button}>{operation === "remove" ? "Remover membro" : "Revogar convite"}</button>}</div><Feedback state={state} /></form>;
}
