import { DealCard } from "@/features/crm/components/deal-card";
import { getStage } from "@/features/crm/constants";
import { formatCurrency } from "@/features/crm/utils";
import type { Deal, DealStageId } from "@/features/crm/types";

export function PipelineColumn({ stageId, deals, selectedId, onSelect, onDrop, onDragStart, onMove }: { stageId: DealStageId; deals: Deal[]; selectedId: string | null; onSelect: (deal: Deal) => void; onDrop: (stage: DealStageId) => void; onDragStart: (dealId: string) => void; onMove: (dealId: string) => void }) {
  const stage = getStage(stageId);
  const total = deals.reduce((sum, deal) => sum + deal.value, 0);
  return <section onDragOver={(event) => event.preventDefault()} onDrop={() => onDrop(stageId)} className="w-[250px] shrink-0 rounded-lg bg-[#f6f5f2]/60 p-2 sm:w-[260px]"><header className="px-1.5 pb-3"><div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">{stage.label}</h2><span className="rounded bg-[var(--border-soft)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--ink-soft)]">{deals.length}</span></div><p className="mt-1 font-mono text-xs text-[var(--ink-soft)]">{formatCurrency(total)}</p><div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--border)]"><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.min(100, stage.probability * 1.25)}%` }} /></div></header><div className="space-y-2">{deals.map((deal) => <DealCard key={deal.id} deal={deal} selected={selectedId === deal.id} onSelect={() => onSelect(deal)} onDragStart={() => onDragStart(deal.id)} onMove={() => onMove(deal.id)} />)}</div><button type="button" className="mt-2 w-full rounded-[var(--radius)] border border-dashed border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--ink-soft)] hover:border-[var(--accent)] hover:text-[var(--accent-dark)]">+ Adicionar negócio</button></section>;
}
