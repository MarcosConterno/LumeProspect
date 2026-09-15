import { loadMemberSettings } from "@/features/platform/repository";
import { MemberForm } from "@/features/platform/components/forms";
import { InviteForm, TeamOperation } from "@/features/auth/components/team-forms";
const labels:Record<string,string>={owner:"Proprietário",admin:"Administrador",member:"Usuário"};
export default async function TeamPage() {
  const {active,user,isMaster,canManage,members,permissions,modules,masterIds,invites}=await loadMemberSettings();
  return <div className="max-w-4xl space-y-6"><header><h2 className="font-display text-2xl">Equipe e permissões</h2><p className="mt-2 text-sm">{active.workspaces.name} · Seu acesso: {isMaster?"Master Lume":labels[active.role]}</p></header>
    {members.map(member=><section key={member.user_id} className="space-y-4 rounded-xl border border-border bg-surface p-5"><div><h2 className="font-medium">{member.profiles?.full_name || "Usuário"}{member.user_id===user.id?" (você)":""}</h2><p className="text-sm text-[var(--ink-soft)]">{masterIds.includes(member.user_id)?"Master Lume":labels[member.role]} · {member.active?"Ativo":"Inativo"}</p></div>
      {canManage&&member.user_id!==user.id&&member.role!=="owner"&&!masterIds.includes(member.user_id)&&<MemberForm workspace={active.workspace_id} person={member.user_id} role={member.role} active={member.active} permissions={permissions.filter(p=>p.user_id===member.user_id)} enabledModules={modules.filter(m=>m.enabled).map(m=>m.module)}/>}
    </section>)}
    {canManage&&<><InviteForm workspace={active.workspace_id} owner/><section className="space-y-3"><h2 className="font-display text-xl">Convites recentes</h2>{invites.map(invite=><div key={invite.id} className="space-y-2 rounded-lg border border-border p-3 text-sm"><p>{invite.email} · {invite.statusLabel}</p>{!invite.accepted_at&&!invite.revoked_at&&(invite.role!=="master"||isMaster)&&<TeamOperation workspace={active.workspace_id} id={invite.id} operation="revoke"/>}</div>)}</section></>}
    <p className="text-sm text-[var(--ink-soft)]">Cada usuário pertence a uma única empresa. Desative o acesso para preservar os vínculos e o histórico. Convites não permitem assumir outra empresa.</p>
  </div>;
}
