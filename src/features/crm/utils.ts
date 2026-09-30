import { getStage } from "@/features/crm/constants";
import type { Deal } from "@/features/crm/types";

function parseDate(value: string) {
  return value.length === 10 ? new Date(`${value}T12:00:00`) : new Date(value);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

export function formatDate(value: string) {
  const date = parseDate(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date) : "Data não informada";
}

export function formatActivityDate(value?: string) {
  if (!value) return "Sem atividade";
  const date = parseDate(value);
  if (!Number.isFinite(date.getTime())) return "Data inválida";
  const today = new Date();
  const day = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date);
  const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return `Hoje · ${time}`;
  if (diff === 1) return `Amanhã · ${time}`;
  if (diff < 0) return `Atrasada há ${Math.abs(diff)} dias`;
  return `${day} · ${time}`;
}

export function daysInStage(deal: Deal) {
  const enteredAt = parseDate(deal.stageEnteredAt);
  if (!Number.isFinite(enteredAt.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - enteredAt.getTime()) / 86400000));
}

export function getDealHealth(deal: Deal) {
  const stage = getStage(deal.stage);
  const days = daysInStage(deal);
  const overdue = deal.nextActivity?.scheduledAt ? parseDate(deal.nextActivity.scheduledAt).getTime() < Date.now() && deal.nextActivity.status !== "completed" : false;
  const noActivity = !deal.nextActivity || deal.nextActivity.status === "completed";
  if (overdue || days > stage.staleAfterDays) return { tone: "coral" as const, label: overdue ? formatActivityDate(deal.nextActivity?.scheduledAt) : `Parado há ${days} dias` };
  if (noActivity) return { tone: "neutral" as const, label: "Sem atividade" };
  if (days >= stage.staleAfterDays - 1) return { tone: "amber" as const, label: `Atenção · ${days} dias na etapa` };
  return { tone: "green" as const, label: "No prazo" };
}

export function needsAttention(deal: Deal) {
  const health = getDealHealth(deal);
  const expectedClosePassed = deal.expectedCloseDate ? parseDate(`${deal.expectedCloseDate}T23:59:59`).getTime() < Date.now() : false;
  return health.tone === "coral" || health.tone === "neutral" || expectedClosePassed;
}

export function sortDeals(deals: Deal[]) {
  return [...deals].sort((a, b) => {
    const healthRank = { coral: 0, amber: 1, neutral: 2, green: 3 } as const;
    const healthDiff = healthRank[getDealHealth(a).tone] - healthRank[getDealHealth(b).tone];
    return healthDiff || b.score - a.score;
  });
}

export function weightedRevenue(deals: Deal[]) {
  return deals.filter((deal) => deal.status === "open").reduce((total, deal) => total + deal.value * (getStage(deal.stage).probability / 100), 0);
}
