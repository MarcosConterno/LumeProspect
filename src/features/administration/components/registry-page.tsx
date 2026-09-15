import Link from "next/link";
import { getRegistry } from "../repository";
import { registryConfig, type RegistryKind } from "../types";
import { RecordForm } from "./record-form";

const statusLabels: Record<string,string> = { prospect:"Em negociação",customer:"Cliente",active:"Ativo",inactive:"Inativo" };
export async function RegistryPage({ kind, searchParams }: {
  kind: RegistryKind; searchParams: Promise<Record<string,string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const config = registryConfig[kind];
  const data = await getRegistry(kind,params);
  const pageUrl = (page: number) => config.path + "?" + new URLSearchParams({ q:data.q,status:data.status,page:String(page) });
  const pages = Math.max(1,Math.ceil(data.count / 25));
  return <div className="max-w-6xl space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-sm text-accent-dark">Cadastros</p><h1 className="mt-2 font-display text-3xl">{config.title}</h1><p className="mt-2 text-sm text-[var(--ink-soft)]">{config.description}</p></div>
      {data.canCreate && <Link href={config.path + "?new=1"} className="rounded-lg bg-accent px-4 py-2 text-sm text-white">Cadastrar {config.singular}</Link>}
    </header>
    {params.saved === "1" && <p role="status" className="rounded-lg bg-[var(--accent-soft)] p-3 text-sm">Cadastro salvo.</p>}
    {data.showForm && <section className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <h2 className="font-display text-xl">{data.record ? "Editar" : "Cadastrar"} {config.singular}</h2>
      <RecordForm key={data.workspace + ":" + (data.record?.id ?? "new") + ":" + (data.record?.version ?? "1")}
        target={{kind,workspace:data.workspace,id:data.record?.id,version:data.record ? Number(data.record.version) : undefined}}
        readOnly={!!data.record && !data.canUpdate} initial={data.record} selectedCompany={data.selectedCompany} cancelHref={config.path} />
    </section>}
    <form className="flex flex-wrap items-end gap-3" action={config.path}>
      <label className="min-w-48 grow text-sm">Buscar pelo nome<input type="search" name="q" maxLength={100} defaultValue={data.q} className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2" /></label>
      <label className="text-sm">Situação<select name="status" defaultValue={data.status} className="mt-1 block rounded-lg border border-border bg-surface px-3 py-2">
        <option value="all">Todas</option>
        {(kind === "company" ? ["prospect","customer","inactive"] : ["active","inactive"]).map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}
      </select></label>
      <button className="rounded-lg border border-border px-4 py-2 text-sm">Filtrar</button>
      <Link href={config.path} className="py-2 text-sm underline">Limpar</Link>
    </form>
    <p className="text-sm text-[var(--ink-soft)]">{data.count} registro(s) encontrado(s).</p>
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="record-table w-full text-left text-sm"><caption className="sr-only">{config.title}</caption>
        <thead className="border-b border-border"><tr><th className="p-4" scope="col">Nome</th><th className="p-4" scope="col">Situação</th><th className="p-4" scope="col">Ação</th></tr></thead>
        <tbody>{data.rows.map(row => <tr key={row.id} className="border-b border-border last:border-0">
          <td className="max-w-lg p-4"><p className="font-medium break-words">{row.name}</p><p className="mt-1 line-clamp-2 text-xs text-[var(--ink-soft)]">{row.detail || "Sem informações adicionais"}</p></td>
          <td className="whitespace-nowrap p-4">{statusLabels[row.status]}</td>
          <td className="p-4"><Link href={config.path + "?edit=" + row.id} className="text-accent-dark underline" aria-label={(data.canUpdate ? "Editar " : "Consultar ") + row.name}>{data.canUpdate ? "Editar" : "Consultar"}</Link></td>
        </tr>)}</tbody>
      </table>
      {!data.rows.length && <p className="p-6 text-sm text-[var(--ink-soft)]">{data.count ? "Nenhum registro nesta página. Volte para a primeira página." : "Nenhum cadastro encontrado. Cadastre o primeiro ou ajuste os filtros."}</p>}
    </div>
    <nav aria-label="Paginação" className="flex flex-wrap items-center gap-4 text-sm">
      {data.page > 1 && <><Link href={pageUrl(1)} className="underline">Primeira</Link><Link href={pageUrl(data.page-1)} className="underline">Anterior</Link></>}
      <span>Página {data.page} de {pages}</span>
      {data.page < pages && <Link href={pageUrl(data.page+1)} className="underline">Próxima</Link>}
    </nav>
  </div>;
}
