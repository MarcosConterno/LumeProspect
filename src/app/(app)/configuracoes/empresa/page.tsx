import Link from "next/link";
import { getSettings, toValues } from "@/features/administration/repository";
import { products } from "@/features/platform/types";
import { loadClient, platformError } from "@/features/platform/repository";
import { RecordForm } from "@/features/administration/components/record-form";
import { ClientForm } from "@/features/platform/components/forms";
import { selectWorkspace } from "@/features/auth/actions";
import { auditDescription } from "@/features/platform/audit";
import { managesUsers } from "@/features/platform/roles";

export default async function CompanySettings({searchParams}:{searchParams:Promise<{saved?:string;empresa?:string}>}) {
  const [{record,active,canManage,isMaster,db},params]=await Promise.all([getSettings(),searchParams]);
  if(isMaster && params.empresa && params.empresa!==active.workspace_id) {
    const {workspace}=await loadClient(params.empresa);
    return <section className="space-y-4 rounded-xl border border-border bg-surface p-5"><h2 className="font-display text-2xl">Configurar {workspace.name}</h2><p className="text-sm">Abra o ambiente desta empresa para consultar e editar suas configurações.</p><form action={selectWorkspace}><input type="hidden" name="workspace" value={workspace.id}/><input type="hidden" name="destination" value="/configuracoes/empresa"/><button className="rounded-lg bg-accent px-4 py-2 text-white">Abrir configurações da empresa</button></form></section>;
  }
  const result=await db.from("workspace_modules").select("module,enabled").eq("workspace_id",active.workspace_id);
  platformError(result.error);
  const modules=result.data ?? [];
  const platform=isMaster ? await loadClient(active.workspace_id) : null;
  return <div className="space-y-6">
    <header><h2 className="font-display text-2xl">Empresa</h2><p className="mt-2 text-sm">{active.workspaces.name}</p></header>
    {params.saved==="1" && <p role="status" className="text-sm text-accent-dark">Dados da empresa atualizados.</p>}
    {platform ? <section className="space-y-4 rounded-xl border border-border bg-surface p-5"><h3 className="font-display text-xl">Plano, módulos e situação</h3><ClientForm key={record.id+":"+record.version} workspace={platform.workspace} modules={modules}/></section> : <section className="space-y-3 rounded-xl border border-border bg-surface p-5"><h3 className="font-display text-xl">Módulos da empresa</h3><ul className="space-y-2 text-sm">{products.map(([key,label])=><li key={key}>{label}: {modules.some(m=>m.module===key&&m.enabled) ? "Liberado" : "Não liberado"}</li>)}</ul><p className="text-xs">A liberação dos módulos é feita pela Lume.</p></section>}
    <section className="space-y-4 rounded-xl border border-border bg-surface p-5"><h3 className="font-display text-xl">Dados cadastrais</h3>{!canManage && <p className="text-sm">Somente administradores podem alterar os dados da empresa.</p>}<RecordForm key={record.id+":"+record.version} target={{kind:"workspace",workspace:active.workspace_id,id:record.id,version:record.version}} initial={toValues(record)} readOnly={!canManage} cancelHref="/configuracoes/empresa"/></section>
    {(isMaster || managesUsers(active.role)) && <Link href={"/configuracoes/usuarios?empresa="+active.workspace_id} className="text-sm text-accent-dark underline">Gerenciar usuários desta empresa</Link>}
    {platform && <section className="space-y-3"><h3 className="font-display text-xl">Histórico administrativo</h3>{!platform.audit.length && <p className="text-sm">Nenhum evento registrado.</p>}{platform.audit.map(event=><p key={event.id} className="rounded-lg border border-border p-3 text-sm">{new Date(event.created_at).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})} · {event.profiles?.full_name || "Sistema"} · {auditDescription(event.event,event.details)}</p>)}</section>}
  </div>;
}
