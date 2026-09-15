import { getSettings, toValues } from "@/features/administration/repository";
import { products } from "@/features/platform/types";
import { loadMemberSettings } from "@/features/platform/repository";
import { RecordForm } from "@/features/administration/components/record-form";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const [{ record, active, canManage }, params, {modules}] = await Promise.all([getSettings(), searchParams,loadMemberSettings()]);
  return <div className="max-w-3xl space-y-6">
    <header><h2 className="font-display text-2xl">Minha empresa</h2><p className="mt-2 text-sm text-[var(--ink-soft)]">Dados da empresa que usa esta conta. As empresas atendidas ficam em Clientes e empresas.</p></header>
    <section className="space-y-3 rounded-xl border border-border bg-surface p-5"><h2 className="font-display text-xl">Módulos do ambiente</h2><ul className="space-y-2 text-sm">{products.map(([key,label])=><li key={key}>{label}: {modules.some(m=>m.module===key&&m.enabled)?"Liberado":"Não liberado"}</li>)}</ul><p className="text-xs text-[var(--ink-soft)]">A liberação é feita pela Lume. Em Equipe, o administrador configura as permissões dos usuários.</p></section>
    {params.saved === "1" && <p role="status" className="rounded-lg bg-[var(--accent-soft)] p-3 text-sm">Dados da empresa atualizados.</p>}
    {!canManage && <p className="text-sm text-[var(--ink-soft)]">Somente o proprietário e administradores podem alterar estes dados.</p>}
    <section className="rounded-xl border border-border bg-surface p-5">
      <RecordForm key={record.id + ":" + record.version} target={{kind:"workspace",workspace:active.workspace_id,id:record.id,version:record.version}} initial={toValues(record)} readOnly={!canManage} cancelHref="/configuracoes/empresa" />
    </section>
  </div>;
}
