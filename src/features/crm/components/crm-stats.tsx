import { CrmIcon } from "@/features/crm/components/crm-icon";
import { formatCurrency, weightedRevenue } from "@/features/crm/utils";
import type { Deal } from "@/features/crm/types";

export function CrmStats({ deals, attentionCount }: { deals: Deal[]; attentionCount: number }) {
  const openDeals = deals.filter((deal) => deal.status === "open");
  const total = openDeals.reduce((sum, deal) => sum + deal.value, 0);
  const stats = [
    { value: formatCurrency(total), label: "Valor total em aberto", icon: "chart" as const, tone: "default" },
    { value: formatCurrency(weightedRevenue(openDeals)), label: "Receita ponderada", icon: "pie" as const, tone: "green" },
    { value: String(openDeals.length), label: "Negócios ativos", icon: "users" as const, tone: "default" },
    { value: String(attentionCount), label: "Precisam de atenção", icon: "alert" as const, tone: "coral" },
  ];
  return <section aria-label="Métricas do pipeline" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <article key={stat.label} className="flex min-w-0 items-center justify-between rounded-[var(--radius)] border border-[var(--border-soft)] bg-surface p-5"><div><p className={`font-mono text-2xl font-semibold ${stat.tone === "green" ? "text-[var(--accent-dark)]" : stat.tone === "coral" ? "text-[var(--coral)]" : "text-foreground"}`}>{stat.value}</p><p className="mt-1 text-xs text-[var(--ink-soft)]">{stat.label}</p></div><span className={`flex size-9 items-center justify-center rounded-full ${stat.tone === "green" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : stat.tone === "coral" ? "bg-[var(--coral-soft)] text-[var(--coral)]" : "bg-[var(--accent-soft)] text-[var(--accent)]"}`}><CrmIcon name={stat.icon} /></span></article>)}</section>;
}
