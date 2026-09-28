import Link from "next/link";
import { ProspectSearch } from "@/features/prospects/components/prospect-search";
import { ProspectList } from "@/features/prospects/components/prospects-explorer";
import { dashboardProspects } from "@/features/prospects/mocks/dashboard";

type ProspectsPageProps = { searchParams: Promise<{ aba?: string; keyword?: string; region?: string; segment?: string }> };

export default async function ProspectsPage({ searchParams }: ProspectsPageProps) {
  const params = await searchParams;
  const search = params.aba === "buscar";
  return <section><header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="font-display text-3xl">Prospects</h1><p className="mt-1 text-[var(--ink-soft)]">Empresas priorizadas pela inteligência do produto.</p></div>{!search && <Link href="/prospects?aba=buscar" className="page-action lume-button lume-button--solid">Buscar novos prospects</Link>}</header>
    <nav aria-label="Seções de prospects" className="mt-6 flex gap-6 border-b border-border text-sm"><Link href="/prospects" className={!search ? "border-b-2 border-accent-dark pb-3 font-semibold text-accent-dark" : "pb-3 text-[var(--ink-soft)]"}>Prospects encontrados</Link><Link href="/prospects?aba=buscar" className={search ? "border-b-2 border-accent-dark pb-3 font-semibold text-accent-dark" : "pb-3 text-[var(--ink-soft)]"}>Buscar novos prospects</Link></nav>
    {search ? <div className="pt-6"><p className="mb-6 max-w-2xl text-sm text-[var(--ink-soft)]">Configure o seu perfil de cliente ideal para a IA localizar empresas mais relevantes para o seu negócio.</p><ProspectSearch /></div> : <div className="pt-6"><ProspectList prospects={dashboardProspects} initialKeyword={params.keyword} initialRegion={params.region || "Todo o Brasil"} initialSegment={params.segment} /></div>}
  </section>;
}
