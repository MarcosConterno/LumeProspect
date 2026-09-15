import { loadClient } from "@/features/platform/repository";
import { ClientForm, PlatformInvite, RevokeInvite } from "@/features/platform/components/forms";
import { selectWorkspace } from "@/features/auth/actions";
import { auditDescription } from "@/features/platform/audit";
export default async function ClientPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  const {workspace,modules,invites,audit}=await loadClient(id);
  return <div className="space-y-6"><header className="flex flex-wrap justify-between gap-4"><div><h1 className="font-display text-3xl">{workspace.name}</h1><p className="mt-2 text-sm">{workspace.is_lume?"Ambiente interno da Lume":"Configuração do cliente Lume"}</p></div><form action={selectWorkspace}><input type="hidden" name="workspace" value={id}/><button className="rounded-lg border border-border px-4 py-2 text-sm">Entrar neste ambiente</button></form></header>
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="space-y-4 rounded-xl border border-border bg-surface p-5"><h2 className="font-display text-xl">Dados e módulos</h2><ClientForm key={workspace.version} workspace={workspace} modules={modules}/></section>
      <section className="space-y-4 rounded-xl border border-border bg-surface p-5"><h2 className="font-display text-xl">Administrador do ambiente</h2><p className="text-sm text-[var(--ink-soft)]">O administrador gerencia usuários e permissões desta empresa. Para criar outro master, use a área Masters.</p><PlatformInvite workspace={id}/><p className="text-xs">Entre no ambiente e acesse Equipe para gerenciar pessoas e permissões.</p></section>
    </div>
    <section className="space-y-3"><h2 className="font-display text-xl">Convites recentes</h2>{invites.length===0&&<p className="text-sm">Nenhum convite.</p>}{invites.map(invite=><div key={invite.id} className="space-y-2 rounded-lg border border-border p-3 text-sm"><p>{invite.email} · {invite.role==="master"?"Master Lume":invite.role==="admin"?"Administrador":"Usuário"} · {invite.statusLabel}</p>{!invite.accepted_at&&!invite.revoked_at&&<RevokeInvite id={invite.id}/>}</div>)}</section>
    <section className="space-y-3"><h2 className="font-display text-xl">Histórico administrativo recente</h2>{audit.length===0&&<p className="text-sm">Nenhum evento registrado.</p>}{audit.map(event=><p key={event.id} className="rounded-lg border border-border p-3 text-sm">{new Date(event.created_at).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})} · {event.profiles?.full_name || "Sistema"} · {auditDescription(event.event,event.details)}</p>)}</section>
  </div>;
}
