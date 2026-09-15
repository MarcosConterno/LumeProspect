"use client";

import { useState } from "react";
import { dealStages, formatCurrency, initialDeals, type Deal, type DealStage } from "@/features/crm/mocks/deals";

export function CrmPipeline() {
  const [deals, setDeals] = useState(initialDeals);
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");

  function moveDeal(dealId: number) {
    setDeals((current) => current.map((deal) => {
      if (deal.id !== dealId) return deal;
      const currentIndex = dealStages.indexOf(deal.stage);
      const nextStage = dealStages[Math.min(currentIndex + 1, dealStages.length - 1)];
      return { ...deal, stage: nextStage };
    }));
  }

  function addDeal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !value) return;
    setDeals((current) => [...current, { id: Date.now(), name: name.trim(), value: Number(value), stage: "Novo", prospectId: null }]);
    setName("");
    setValue("");
    setIsAdding(false);
  }

  return <div><div className="mb-6 flex justify-end"><button type="button" onClick={() => setIsAdding((current) => !current)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold transition-colors hover:border-foreground">+ Novo negócio</button></div>{isAdding && <form onSubmit={addDeal} className="mb-6 grid gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-5 sm:grid-cols-[1fr_180px_auto] sm:items-end"><label className="text-xs font-semibold text-[var(--ink-soft)]">Nome do prospect/cliente<input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent" /></label><label className="text-xs font-semibold text-[var(--ink-soft)]">Valor estimado (R$)<input type="number" min="0" value={value} onChange={(event) => setValue(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent" /></label><button type="submit" className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-white hover:bg-black">Adicionar</button></form>}<div className="flex gap-4 overflow-x-auto pb-3">{dealStages.map((stage) => <PipelineColumn key={stage} stage={stage} deals={deals.filter((deal) => deal.stage === stage)} onMove={moveDeal} />)}</div></div>;
}

function PipelineColumn({ stage, deals, onMove }: { stage: DealStage; deals: Deal[]; onMove: (dealId: number) => void }) {
  return <section className="w-64 shrink-0"><header className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-[0.04em] text-[var(--ink-soft)]"><span>{stage}</span><span className="font-mono font-medium text-[var(--ink-faint)]">{deals.length}</span></header>{deals.length ? deals.map((deal) => <article key={deal.id} className="mb-2.5 rounded-[var(--radius)] border border-[var(--border-soft)] bg-surface p-4"><h3 className="mb-2 text-sm font-semibold">{deal.name}</h3><div className="flex items-center justify-between"><span className="font-mono text-xs text-[var(--ink-soft)]">{formatCurrency(deal.value)}</span>{stage !== "Fechado" && <button type="button" onClick={() => onMove(deal.id)} aria-label={`Mover ${deal.name} para a próxima etapa`} className="px-1 text-lg leading-none text-[var(--ink-faint)] hover:text-[var(--accent-dark)]">→</button>}</div></article>) : <p className="py-1 text-xs text-[var(--ink-faint)]">Vazio por aqui.</p>}</section>;
}
