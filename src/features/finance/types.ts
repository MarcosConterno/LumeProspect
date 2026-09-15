import type { Json } from "@/types/database";

export type FinanceKind = "receivable" | "payable";
export type CompanyChoice = { id: string; name: string };
export type FinanceCategory = { id: string; name: string; kind: FinanceKind; active: boolean; version: number };
export type FinanceEntry = {
  id: string; type: FinanceKind; companyId: string; companyName: string; categoryId: string; categoryName: string;
  description: string; dueDate: string; amountCents: number; paidCents: number; hasPayments: boolean;
  notes: string; cancelledAt: string | null; cancelReason: string | null; version: number;
};
export type FinancePermissions = { create: boolean; update: boolean; cancel: boolean; settle: boolean; reverse: boolean; categories: boolean };
export type FinanceFilters = {
  month: string; type: string; status: string; query: string; page: number;
  dateFrom?: string; dateTo?: string; companyQuery?: string; categoryId?: string;
  minAmountCents?: number; maxAmountCents?: number;
};
export type FinanceSearch = {
  entries: FinanceEntry[]; count: number; page: number; today: string;
  dateFrom: string; dateTo: string; categoryName: string | null;
  totals: { receivable: number; payable: number; received: number; paid: number };
};
export type FinanceSnapshot = {
  workspace: string; today: string; month: string; page: number; count: number;
  entries: FinanceEntry[]; categories: FinanceCategory[]; permissions: FinancePermissions;
  totals: { receivable: number; payable: number; received: number; paid: number };
  monthly: { month: number; value: number }[]; expenses: { id: string; name: string; value: number }[];
  search: FinanceSearch;
};
export type FinanceDetail = {
  entry: FinanceEntry;
  payments: { id: string; amountCents: number; paidOn: string; notes: string; reversedAt: string | null; reverseReason: string | null; actor: string }[];
  history: { id: string; event: string; details: Json; createdAt: string; actor: string }[];
};
export type EntryInput = { id: string; version?: number; type: FinanceKind; companyId: string; categoryId: string; description: string; dueDate: string; amountCents: number; notes: string };
export type FinanceResult<T> = { data: T; error?: never } | { error: string; data?: never };

