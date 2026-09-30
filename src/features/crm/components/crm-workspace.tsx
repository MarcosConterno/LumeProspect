"use client";

import { useMemo, useState } from "react";
import { moveDeal as moveDealAction, refreshCrmOptions, saveDeal, setActivityStatus } from "@/features/crm/actions";
import { CrmFilters } from "@/features/crm/components/crm-filters";
import { CrmStats } from "@/features/crm/components/crm-stats";
import { CrmTabs, type CrmView } from "@/features/crm/components/crm-tabs";
import { DealDrawer } from "@/features/crm/components/deal-drawer";
import { NewDealForm } from "@/features/crm/components/new-deal-form";
import { PipelineColumn } from "@/features/crm/components/pipeline-column";
import { dealStages } from "@/features/crm/constants";
import { formatCurrency, formatDate, needsAttention, sortDeals } from "@/features/crm/utils";
import type { CrmOptions, CrmSnapshot, Deal, DealInput, DealStageId } from "@/features/crm/types";

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

function getCurrentMonth() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  return `${year}-${month}`;
}

function getCurrentMonthLabel() {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", month: "long", year: "numeric" }).format(new Date());
}

function localDealFromInput(input: DealInput, id: string, options: CrmOptions, version?: number): Deal {
  const company = options.companies.find((item) => item.id === input.companyId);
  const contact = options.contacts.find((item) => item.id === input.contactId);
  const service = options.services.find((item) => item.id === input.serviceId);
  const owner = options.owners.find((item) => item.id === input.ownerId);
  const now = new Date().toISOString();
  return {
    id,
    name: input.name,
    workspaceId: "local",
    version,
    companyId: input.companyId,
    companyName: company?.name ?? input.name,
    companyLocation: company?.location ?? undefined,
    companySize: company?.employee_range ?? undefined,
    contactId: input.contactId || undefined,
    contactName: contact?.name ?? "Sem contato",
    contactRole: contact?.role ?? "",
    contactEmail: contact?.email ?? undefined,
    contactPhone: contact?.phone ?? undefined,
    serviceId: input.serviceId || undefined,
    serviceName: service?.name ?? "Sem serviço",
    ownerId: input.ownerId || undefined,
    ownerName: owner?.name ?? "Sem responsável",
    value: input.value,
    stage: input.stage,
    status: input.status,
    expectedCloseDate: input.expectedCloseDate,
    score: 0,
    stageEnteredAt: now,
    createdAt: now,
    updatedAt: now,
    summary: input.summary,
    lostReason: input.lostReason || undefined,
  };
}

export function CrmWorkspace({ initial }: { initial: CrmSnapshot }) {
  const [deals, setDeals] = useState(initial.deals);
  const [options, setOptions] = useState<CrmOptions>(initial.options);
  const [optionsLoaded, setOptionsLoaded] = useState(initial.optionsComplete !== false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<CrmView>("pipeline");
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<CrmFiltersState>(initialFilters);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const currentMonth = getCurrentMonth();
  const currentMonthLabel = getCurrentMonthLabel();

  const selectedDeal = deals.find((deal) => deal.id === selectedId) ?? null;
  const attentionCount = deals.filter((deal) => deal.status === "open" && needsAttention(deal)).length;
  const filteredDeals = useMemo(() => {
    const filtered = deals
      .filter((deal) => deal.status === "open")
      .filter((deal) => filters.stage === "all" || deal.stage === filters.stage)
      .filter((deal) => filters.service === "all" || deal.serviceId === filters.service)
      .filter((deal) => filters.owner === "all" || deal.ownerId === filters.owner)
      .filter((deal) => filters.value === "all" || (filters.value === "small" && deal.value < 5000) || (filters.value === "medium" && deal.value >= 5000 && deal.value <= 10000) || (filters.value === "large" && deal.value > 10000))
      .filter((deal) => filters.closing === "all" || (filters.closing === "month" && deal.expectedCloseDate.startsWith(currentMonth)))
      .filter((deal) => filters.attention === "all" || needsAttention(deal));

    if (filters.sort === "score") return [...filtered].sort((a, b) => b.score - a.score);
    if (filters.sort === "value") return [...filtered].sort((a, b) => b.value - a.value);
    return sortDeals(filtered);
  }, [currentMonth, deals, filters]);

  async function moveDeal(dealId: string, stage: DealStageId) {
    const current = deals.find((deal) => deal.id === dealId);
    if (!current || current.stage === stage || current.version === undefined) return;

    setError("");
    setNotice("");
    setPending(dealId);
    setDeals((items) => items.map((deal) => deal.id === dealId ? { ...deal, stage } : deal));

    const result = await moveDealAction(initial.workspaceId, dealId, current.version, stage);
    if (result.error) {
      setDeals((items) => items.map((deal) => deal.id === dealId ? current : deal));
      setError(result.error);
    } else {
      setDeals((items) => items.map((deal) => deal.id === dealId ? { ...deal, version: (current.version ?? 1) + 1, stageEnteredAt: new Date().toISOString() } : deal));
      setNotice("Etapa atualizada.");
    }
    setPending(null);
  }

  function dropDeal(stage: DealStageId) {
    if (draggedId) moveDeal(draggedId, stage);
    setDraggedId(null);
  }

  async function completeActivity() {
    const activity = selectedDeal?.nextActivity;
    if (!selectedDeal || !activity || activity.version === undefined) return;

    setError("");
    setNotice("");
    setPending(activity.id);
    setDeals((items) => items.map((deal) => deal.id === selectedDeal.id ? { ...deal, nextActivity: { ...activity, status: "completed", completedAt: new Date().toISOString(), version: (activity.version ?? 1) + 1 } } : deal));
    const result = await setActivityStatus(initial.workspaceId, selectedDeal.id, activity.id, activity.version, "completed");
    if (result.error) {
      setDeals((items) => items.map((deal) => deal.id === selectedDeal.id ? selectedDeal : deal));
      setError(result.error);
    } else {
      setNotice("Atividade concluída.");
    }
    setPending(null);
  }

  async function createDeal(input: DealInput) {
    setError("");
    setNotice("");
    const temporaryId = `pending-${Date.now()}`;
    const optimisticDeal = localDealFromInput(input, temporaryId, options);
    setDeals((items) => [optimisticDeal, ...items]);
    setShowNewDeal(false);
    setNotice("Salvando negócio...");
    setPending("create");
    const result = await saveDeal(initial.workspaceId, input);
    if (result.error || !result.data) {
      setDeals((items) => items.filter((deal) => deal.id !== temporaryId));
      setError(result.error ?? "Não foi possível criar o negócio.");
    } else {
      const persistedDeal = localDealFromInput(input, result.data.id, options, 1);
      setDeals((items) => items.map((deal) => deal.id === temporaryId ? persistedDeal : deal));
      setNotice("Negócio criado.");
    }
    setPending(null);
  }

  async function openNewDeal() {
    setError("");
    setNotice("");
    if (optionsLoaded) {
      setShowNewDeal(true);
      return;
    }
    setPending("options");
    const result = await refreshCrmOptions(initial.workspaceId);
    if (result.error || !result.data) {
      setError(result.error ?? "Não foi possível carregar os cadastros do CRM.");
    } else {
      setOptions(result.data);
      setOptionsLoaded(true);
      setShowNewDeal(true);
    }
    setPending(null);
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
        <button type="button" className="page-action crm-period"><span aria-hidden="true">▣</span> {currentMonthLabel}</button>
      </header>
      <CrmTabs active={view} onChange={setView} />
      {(error || notice) && <div className={`mt-4 rounded-lg border px-4 py-3 text-sm ${error ? "border-[var(--coral)] bg-[var(--coral-soft)] text-[var(--coral)]" : "border-[var(--border-soft)] bg-[var(--accent-soft)] text-[var(--accent-dark)]"}`} role={error ? "alert" : "status"}>{error || notice}</div>}
      <div className="mt-6"><CrmStats deals={deals} attentionCount={attentionCount} /></div>
      <div className="mt-6"><CrmFilters {...filters} options={options} closingLabel={currentMonthLabel} onChange={onFilterChange} onNewDeal={openNewDeal} newDealPending={pending === "options"} /></div>
      {view === "pipeline" && <div className="mt-5 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[#fbfaf8] p-2"><div className="crm-board flex min-w-0 gap-2 overflow-x-auto pb-2">{dealStages.map((stage) => <PipelineColumn key={stage.id} stageId={stage.id} deals={filteredDeals.filter((deal) => deal.stage === stage.id)} selectedId={selectedId} onSelect={(deal) => setSelectedId(deal.id)} onDrop={dropDeal} onDragStart={setDraggedId} onMove={(dealId) => { const current = deals.find((deal) => deal.id === dealId); if (!current) return; const next = dealStages[Math.min(dealStages.findIndex((item) => item.id === current.stage) + 1, dealStages.length - 1)]; moveDeal(dealId, next.id); }} />)}</div></div>}
      {view === "list" && <DealsTable deals={filteredDeals} onSelect={(deal) => setSelectedId(deal.id)} />}
      {view === "forecast" && <Forecast deals={deals} />}
      {selectedDeal && <DealDrawer deal={selectedDeal} onClose={() => setSelectedId(null)} onStageChange={(stage) => void moveDeal(selectedDeal.id, stage)} onCompleteActivity={() => void completeActivity()} pending={pending !== null} />}
      {showNewDeal && <NewDealForm options={options} pending={pending === "create"} onSubmit={createDeal} onCancel={() => setShowNewDeal(false)} />}
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
