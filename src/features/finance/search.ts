import type { FinanceFilters, FinanceSearch } from "./types";
import { dateLabel, money } from "./format";

export const financeStatuses = [
  ["all","Ativos"],["any","Todos, inclusive cancelados"],["open","Em aberto"],
  ["overdue","Em atraso"],["partial","Baixa parcial"],["settled","Pagos e recebidos"],["cancelled","Cancelados"],
] as const;

export function financeFilterSummary(filters: FinanceFilters, search: FinanceSearch) {
  return [
    "Vencimento: "+dateLabel(search.dateFrom)+" a "+dateLabel(search.dateTo),
    "Tipo: "+(filters.type==="receivable" ? "A receber" : filters.type==="payable" ? "A pagar" : "Todos"),
    "Situação: "+(financeStatuses.find(([key])=>key===filters.status)?.[1] ?? filters.status),
    "Cliente / fornecedor: "+(filters.companyQuery || "Todos"),
    "Categoria: "+(search.categoryName || "Todas"),
    "Valor do lançamento: "+(filters.minAmountCents === undefined ? "sem mínimo" : "de "+money(filters.minAmountCents))+" / "+(filters.maxAmountCents === undefined ? "sem máximo" : "até "+money(filters.maxAmountCents)),
    ...(filters.query ? ["Busca: "+filters.query] : []),
  ];
}
