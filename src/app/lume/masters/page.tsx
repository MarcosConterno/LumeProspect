import { loadMasters } from "@/features/platform/repository";
import { PlatformInvite, RemoveMaster } from "@/features/platform/components/forms";
export default async function MastersPage() {
  const {masters,home,user}=await loadMasters();
  return <div className="max-w-3xl space-y-6"><header><h1 className="font-display text-3xl">Masters da Lume</h1><p className="mt-2 text-sm text-[var(--ink-soft)]">Acesso à plataforma inteira, à liberação de módulos e a todos os ambientes.</p></header>
    {masters.map(master=><section key={master.user_id} className="space-y-3 rounded-xl border border-border bg-surface p-5"><h2 className="font-medium">{master.full_name || master.email}{master.user_id===user.id?" (você)":""}</h2><p className="text-sm">{master.email}</p>{masters.length>1&&master.user_id!==user.id&&<RemoveMaster id={master.user_id}/>}</section>)}
    {home&&<section className="space-y-4 rounded-xl border border-border bg-surface p-5"><h2 className="font-display text-xl">Convidar outro master</h2><PlatformInvite workspace={home} master/><p className="text-xs text-[var(--ink-soft)]">A pessoa define sua senha, confirma o e-mail e aceita o convite. Uma conta já vinculada a um cliente não pode se tornar master por este convite.</p></section>}
    <p className="text-sm">A Lume sempre mantém pelo menos um master ativo.</p>
  </div>;
}

