import { loadMasters } from "@/features/platform/repository";
import { PlatformInvite, RemoveMaster, RevokeInvite } from "@/features/platform/components/forms";
import Link from "next/link";
export default async function MastersPage() {
  const {masters,home,user,invites}=await loadMasters();
  return <div className="max-w-3xl space-y-6"><header><h1 className="font-display text-3xl">Masters da Lume</h1><p className="mt-2 text-sm text-[var(--ink-soft)]">Acesso à plataforma inteira, à liberação de módulos e a todos os ambientes.</p></header>
    {masters.map(master=><section key={master.user_id} className="space-y-3 rounded-xl border border-border bg-surface p-5"><h2 className="font-medium">{master.full_name || master.email}{master.user_id===user.id?" (você)":""}</h2><p className="text-sm">{master.email}</p>{masters.length>1&&master.user_id!==user.id&&<RemoveMaster id={master.user_id}/>}</section>)}
    {home&&<section className="space-y-5 rounded-xl border border-border bg-surface p-5"><h2 className="font-display text-xl">Adicionar outro master</h2>
      <div className="space-y-2"><h3 className="font-semibold">1. A pessoa precisa de uma conta</h3><p className="text-sm">Se você já criou o e-mail e a senha na empresa interna Lume, siga para o próximo passo. Criar a conta como administrador ainda não concede acesso master.</p><Link href={"/lume/clientes/"+home+"/usuarios"} className="inline-block text-sm text-accent-dark underline">Criar conta na Lume</Link></div>
      <div className="space-y-3"><h3 className="font-semibold">2. Gere o convite de master</h3><PlatformInvite workspace={home} master/></div>
      <div className="space-y-2"><h3 className="font-semibold">3. A pessoa aceita o acesso</h3><p className="text-sm">Compartilhe o link. A pessoa deve abrir, entrar com o e-mail convidado e clicar em Aceitar acesso master Lume. Depois disso, aparecerá na lista acima e terá acesso a todas as empresas e módulos.</p></div>
      <p className="text-xs text-[var(--ink-soft)]">Uma conta vinculada a um cliente não pode se tornar master por este convite. Nenhuma conta é transferida automaticamente.</p>
    </section>}
    <section className="space-y-3"><h2 className="font-display text-xl">Convites de master</h2>{!invites.length&&<p className="text-sm">Nenhum convite gerado.</p>}{invites.map(invite=><div key={invite.id} className="space-y-2 rounded-lg border border-border p-4 text-sm"><p>{invite.email} · <strong>{invite.statusLabel}</strong></p>{!invite.accepted_at&&!invite.revoked_at&&<RevokeInvite id={invite.id}/>}</div>)}</section>
    <p className="text-sm">A Lume sempre mantém pelo menos um master ativo.</p>
  </div>;
}

