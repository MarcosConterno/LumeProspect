"use client";

import { useMemo, useState } from "react";
import { CrmFilters } from "@/features/crm/components/crm-filters";
import { CrmStats } from "@/features/crm/components/crm-stats";
import { CrmTabs, type CrmView } from "@/features/crm/components/crm-tabs";
import { DealDrawer } from "@/features/crm/components/deal-drawer";
import { NewDealForm } from "@/features/crm/components/new-deal-form";
import { PipelineColumn } from "@/features/crm/components/pipeline-column";
import { dealStages } from "@/features/crm/constants";
import { crmDeals } from "@/features/crm/mocks/crm";
import { formatCurrency, formatDate, needsAttention, sortDeals } from "@/features/crm/utils";
import type { Deal, DealStageId } from "@/features/crm/types";

type CrmFilterKey = "stage" | "service" | "owner" | "sort" | "value" | "closing" | "attention";

type CrmFiltersState = Record<CrmFilterKey, string>;

const initialFilters: CrmFiltersState = {
  stage: "all",
  service: "all",
  owner: "all",
  sort: "activity",
  value: "all",
  closing: "all",
  attention: "all",
};

export function CrmWorkspace() {
  const [deals, setDeals] = useState(crmDeals);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<CrmView>("pipeline");
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<CrmFiltersState>(initialFilters);

  const selectedDeal = deals.find((deal) => deal.id === selectedId) ?? null;
  const attentionCount = deals.filter((deal) => deal.status === "open" && needsAttention(deal)).length;
  const filteredDeals = useMemo(() => {
    const filtered = deals
      .filter((deal) => deal.status === "open")
      .filter((deal) => filters.stage === "all" || deal.stage === filters.stage)
      .filter((deal) => filters.service === "all" || deal.serviceName === filters.service)
      .filter((deal) => filters.owner === "all" || deal.ownerName === filters.owner)
      .filter((deal) => filters.value === "all" || (filters.value === "small" && deal.value < 5000) || (filters.value === "medium" && deal.value >= 5000 && deal.value <= 10000) || (filters.value === "large" && deal.value > 10000))
      .filter((deal) => filters.closing === "all" || (filters.closing === "month" && deal.expectedCloseDate.startsWith("2026-09")))
      .filter((deal) => filters.attention === "all" || needsAttention(deal));

    if (filters.sort === "score") return [...filtered].sort((a, b) => b.score - a.score);
    if (filters.sort === "value") return [...filtered].sort((a, b) => b.value - a.value);
    return sortDeals(filtered);
  }, [deals, filters]);

  function updateDeal(dealId: string, update: Partial<Deal>) {
    setDeals((current) => current.map((deal) => deal.id === dealId ? { ...deal, ...update, updatedAt: "2026-09-13" } : deal));
  }

  function moveDeal(dealId: string, stage: DealStageId) {
    updateDeal(dealId, { stage, stageEnteredAt: "2026-09-13" });
  }

  function dropDeal(stage: DealStageId) {
    if (draggedId) moveDeal(draggedId, stage);
    setDraggedId(null);
  }

  function completeActivity() {
    if (!selectedDeal?.nextActivity) return;
    updateDeal(selectedDeal.id, { nextActivity: { ...selectedDeal.nextActivity, status: "completed", completedAt: "2026-09-13T12:00:00" } });
  }

  function onFilterChange(key: CrmFilterKey, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="min-w-0 xl:max-w-[1720px]">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--accent-dark)]">CRM</p>
          <h1 className="font-display text-3xl">Pipeline Comercial</h1>
          <p className="mt-1 text-[14.5px] text-[var(--ink-soft)]">Acompanhe seus negócios e mantenha o foco no que realmente importa.</p>
        </div>
        <button type="button" className="crm-period"><span aria-hidden="true">▣</span> Setembro 2026</button>
      </header>
      <CrmTabs active={view} onChange={setView} />
      <div className="mt-6"><CrmStats deals={deals} attentionCount={attentionCount} /></div>
      <div className="mt-6"><CrmFilters {...filters} onChange={onFilterChange} onNewDeal={() => setShowNewDeal(true)} /></div>
      {view === "pipeline" && <div className="mt-5 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[#fbfaf8] p-2"><div className="crm-board flex min-w-0 gap-2 overflow-x-auto pb-2">{dealStages.map((stage) => <PipelineColumn key={stage.id} stageId={stage.id} deals={filteredDeals.filter((deal) => deal.stage === stage.id)} selectedId={selectedId} onSelect={(deal) => setSelectedId(deal.id)} onDrop={dropDeal} onDragStart={setDraggedId} onMove={(dealId) => { const current = deals.find((deal) => deal.id === dealId); if (!current) return; const next = dealStages[Math.min(dealStages.findIndex((item) => item.id === current.stage) + 1, dealStages.length - 1)]; moveDeal(dealId, next.id); }} />)}</div></div>}
      {view === "list" && <DealsTable deals={filteredDeals} onSelect={(deal) => setSelectedId(deal.id)} />}
      {view === "forecast" && <Forecast deals={deals} />}
      {selectedDeal && <DealDrawer deal={selectedDeal} onClose={() => setSelectedId(null)} onStageChange={(stage) => moveDeal(selectedDeal.id, stage)} onCompleteActivity={completeActivity} />}
      {showNewDeal && <NewDealForm onSubmit={(deal) => { setDeals((current) => [...current, deal]); setShowNewDeal(false); }} onCancel={() => setShowNewDeal(false)} />}
    </div>
  );
}

function DealsTable({ deals, onSelect }: { deals: Deal[]; onSelect: (deal: Deal) => void }) {
  return <div className="mt-5 overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-surface"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b border-[var(--border-soft)] bg-[#f6f5f2] text-[11px] uppercase tracking-wide text-[var(--ink-faint)]"><tr>{["Empresa", "Etapa", "Valor", "Score", "Serviço", "Decisor", "Responsável", "Fechamento"].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody>{deals.map((deal) => <tr key={deal.id} onClick={() => onSelect(deal)} className="cursor-pointer border-b border-[var(--border-soft)] last:border-0 hover:bg-[#fbfaf8]"><td className="px-4 py-3 font-semibold">{deal.companyName}</td><td className="px-4 py-3 text-[var(--ink-soft)]">{dealStages.find((stage) => stage.id === deal.stage)?.label}</td><td className="px-4 py-3 font-mono">{formatCurrency(deal.value)}</td><td className="px-4 py-3 font-mono">{deal.score}</td><td className="px-4 py-3 text-[var(--ink-soft)]">{deal.serviceName}</td><td className="px-4 py-3 text-[var(--ink-soft)]">{deal.contactName}</td><td className="px-4 py-3 text-[var(--ink-soft)]">{deal.ownerName}</td><td className="px-4 py-3 text-[var(--ink-soft)]">{formatDate(deal.expectedCloseDate)}</td></tr>)}</tbody></table></div>;
}

function Forecast({ deals }: { deals: Deal[] }) {
  const openDeals = deals.filter((deal) => deal.status === "open");
  const grouped = openDeals.reduce<Record<string, number>>((result, deal) => { result[deal.expectedCloseDate.slice(0, 7)] = (result[deal.expectedCloseDate.slice(0, 7)] ?? 0) + deal.value; return result; }, {});
  return <section className="mt-5 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-surface p-6"><h2 className="font-display text-xl">Previsão de fechamento</h2><p className="mt-1 text-sm text-[var(--ink-soft)]">Receita por mês a partir dos negócios em aberto.</p><div className="mt-6 grid gap-3 sm:grid-cols-3">{Object.entries(grouped).map(([month, value]) => <article key={month} className="rounded-[var(--radius)] bg-[#f6f5f2] p-4"><p className="text-xs text-[var(--ink-faint)]">{month}</p><p className="mt-2 font-mono text-lg font-semibold text-[var(--accent-dark)]">{formatCurrency(value)}</p></article>)}</div></section>;
}
