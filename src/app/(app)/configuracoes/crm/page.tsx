import Link from "next/link";
import { requireModule } from "@/features/auth/module-access";
import { dealStages } from "@/features/crm/constants";
import { managesUsers } from "@/features/platform/roles";
export default async function Page() {
  const {active,isMaster}=await requireModule("crm");
  return <div className="space-y-5"><header><h2 className="font-display text-2xl">Configurações do CRM</h2><p className="mt-2 text-sm">Cadastros comerciais e regras atuais do funil.</p></header>
    <section className="space-y-4 rounded-xl border border-border bg-surface p-5"><h3 className="font-display text-xl">Cadastros do módulo</h3><div className="flex flex-wrap gap-4 text-sm text-accent-dark"><Link className="underline" href="/clientes">Clientes e contatos</Link><Link className="underline" href="/configuracoes/servicos">Configurar serviços</Link>{(isMaster || managesUsers(active.role)) && <Link className="underline" href="/configuracoes/usuarios">Permissões dos usuários</Link>}</div></section>
    <section className="space-y-3 rounded-xl border border-border bg-surface p-5"><h3 className="font-display text-xl">Etapas do funil</h3><p className="text-sm text-[var(--ink-soft)]">Consulta das etapas atuais. A personalização por empresa ainda não está disponível; o pipeline segue em demonstração.</p><ol className="space-y-3">{dealStages.map(stage=><li key={stage.id} className="flex flex-wrap justify-between gap-2 border-b border-border py-2 text-sm"><strong>{stage.label}</strong><span>Probabilidade {stage.probability}% · alerta após {stage.staleAfterDays} dias</span></li>)}</ol></section>
  </div>;
}
