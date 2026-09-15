import type { FinanceEntry } from "./types";
export const monthNames = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
export const money = (cents: number) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100);
export const dateLabel = (date: string) => date.split("-").reverse().join("/");
export function entryStatus(entry: FinanceEntry, today: string) {
  if(entry.cancelledAt) return "Cancelado";
  if(entry.paidCents===entry.amountCents) return entry.type==="receivable"?"Recebido":"Pago";
  if(entry.dueDate<today) return entry.paidCents>0?"Parcial · em atraso":"Em atraso";
  return entry.paidCents>0?"Parcial":"Em aberto";
}
export function amountInput(cents: number) { return (cents/100).toFixed(2); }

