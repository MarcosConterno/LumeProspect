import Link from "next/link";
import type { DashboardProspect } from "@/features/prospects/mocks/dashboard";

const potentialLabel = {
  alto: "Alto",
  medio: "Médio",
  baixo: "Baixo",
} as const;

export function ProspectRow({ prospect }: { prospect: DashboardProspect }) {
  return (
    <Link
      href={`/prospects/${prospect.id}`}
      className="group flex items-center gap-4 border-b border-[var(--border-soft)] px-1 py-4 transition-colors last:border-b-0 hover:bg-[#f6f5f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span className={`score-badge score-${prospect.potential}`}>{prospect.score}</span>
      <span className="min-w-0 flex-1">
        <span className="mb-1 flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground">{prospect.name}</span>
          <span className={`potential-tag potential-${prospect.potential}`}>{potentialLabel[prospect.potential]}</span>
        </span>
        <span className="block text-xs text-[var(--ink-soft)]">{prospect.segment} · {prospect.location}</span>
        <span className="mt-1 flex items-start gap-1.5 text-xs text-[var(--ink-faint)]">
          <span aria-hidden="true" className="mt-0.5 text-accent">✦</span>
          <span className="line-clamp-2">{prospect.insight}</span>
        </span>
      </span>
      <span aria-hidden="true" className="text-lg text-[var(--border)] transition-colors group-hover:text-[var(--amber)]">
        {prospect.favorite ? "★" : "☆"}
      </span>
    </Link>
  );
}
