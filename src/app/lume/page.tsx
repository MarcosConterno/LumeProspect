import Link from "next/link";
import { loadPlatform } from "@/features/platform/repository";
import { ClientForm } from "@/features/platform/components/forms";
export default async function LumePage({searchParams}:{searchParams:Promise<{q?:string;page?:string;new?:string}>}) {
  const params=await searchParams;
  const q=(params.q ?? "").trim().slice(0,100);
  const requested=Number(params.page ?? 1);
  const page=Number.isSafeInteger(requested)&&requested>0 ? Math.min(requested,10000):1;
  const {rows,count}=await loadPlatform(q,page);
  const href=(p:number)=>"/lume?"+new URLSearchParams({q,page:String(p)});
  return <div className="space-y-6">
    <header className="flex flex-wrap justify-between gap-4"><div><h1 className="font-display text-3xl">Clientes e ambientes</h1><p className="mt-2 text-sm text-[var(--ink-soft)]">Cadastre empresas, libere produtos e configure os acessos iniciais.</p></div><Link href="/lume?new=1" className="inline-flex h-10 shrink-0 items-center justify-center self-start whitespace-nowrap rounded-lg bg-accent px-4 text-sm font-medium text-white">Cadastrar cliente</Link></header>
    {params.new==="1"&&<section className="max-w-xl space-y-3 rounded-xl border border-border bg-surface p-5"><h2 className="font-display text-xl">Novo cliente Lume</h2><ClientForm/><p className="text-xs">Depois de cadastrar, selecione os módulos e gere o convite do administrador.</p></section>}
    <form className="flex gap-3"><label className="grow text-sm">Buscar empresa<input name="q" maxLength={100} defaultValue={q} className="mt-1 block w-full rounded-lg border border-border bg-surface p-2"/></label><button className="self-end rounded-lg border border-border px-4 py-2 text-sm">Buscar</button></form>
    <p className="text-sm">{count} ambiente(s)</p>
    <div className="grid gap-4 md:grid-cols-2">{rows.map(row=><Link href={"/lume/clientes/"+row.id} key={row.id} className="space-y-2 rounded-xl border border-border bg-surface p-5"><h2 className="font-display text-xl">{row.name}</h2><p className="text-sm">{row.is_lume?"Empresa interna Lume":"Cliente Lume"} · {row.status==="active"?"Ativa":"Suspensa"}</p><p className="text-sm text-accent-dark">Configurar ambiente →</p></Link>)}</div>
    {!rows.length&&<p className="text-sm">Nenhum ambiente encontrado.</p>}
    <nav aria-label="Paginação" className="flex gap-4 text-sm">{page>1&&<Link href={href(page-1)} className="underline">Anterior</Link>}<span>Página {page}</span>{page*25<count&&<Link href={href(page+1)} className="underline">Próxima</Link>}</nav>
  </div>;
}
