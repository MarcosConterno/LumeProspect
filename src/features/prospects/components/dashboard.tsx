import Link from "next/link";
import { DashboardStat } from "@/features/prospects/components/dashboard-stat";
import { ProspectRow } from "@/features/prospects/components/prospect-row";
import { dashboardMetrics, dashboardProspects } from "@/features/prospects/mocks/dashboard";

export function Dashboard() {
  const recentProspects = dashboardProspects.slice(0, 3);

  return (
    <div className="animate-[fade-in_450ms_ease_both]">
      <p className="mb-2 text-[11px] uppercase tracking-[0.06em] text-[var(--ink-faint)]">Terça-feira, 25 de agosto de 2026</p>
      <h1 className="font-display text-3xl text-foreground sm:text-4xl">Olá, Rafael</h1>
      <p className="mt-1 text-[14.5px] text-[var(--ink-soft)]">Sua prospecção inteligente está pronta para trabalhar.</p>

      <section className="mt-8 flex flex-wrap items-center justify-between gap-5 border border-[#d9eae2] bg-[var(--accent-soft)] px-6 py-5" style={{ borderRadius: "var(--radius-lg)" }}>
        <div>
          <h2 className="font-display text-lg text-[var(--accent-dark)]">Encontre novos prospects agora</h2>
          <p className="mt-1 max-w-xl text-[13px] text-[#3e6a5b]">A IA analisa milhares de empresas e entrega só as que fazem sentido para o seu perfil.</p>
        </div>
        <Link href="/buscar" className="shrink-0 rounded-lg bg-foreground px-4 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          Buscar prospects <span aria-hidden="true">→</span>
        </Link>
      </section>

      <section aria-label="Resumo da prospecção" className="mt-9 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStat value={dashboardProspects.length} label="Prospects encontrados" detail="Última busca: hoje" />
        <DashboardStat value={dashboardMetrics.averageScore} label="Score médio" detail="Acima da média do setor" />
        <DashboardStat value={dashboardMetrics.approaches} label="Abordagens geradas" detail={`${dashboardMetrics.sentApproaches} marcadas como enviadas`} />
        <DashboardStat value={dashboardMetrics.favoriteCount} label="Favoritos salvos" detail="Nexus e Vértice" />
      </section>

      <section className="mt-11">
        <div className="mb-2 flex items-baseline justify-between gap-4">
          <h2 className="text-[15px] font-semibold">Prospects recentes</h2>
          <Link href="/prospects" className="text-[13px] font-semibold text-[var(--accent-dark)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
            Ver todos <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div>{recentProspects.map((prospect) => <ProspectRow key={prospect.id} prospect={prospect} />)}</div>
      </section>
    </div>
  );
}
