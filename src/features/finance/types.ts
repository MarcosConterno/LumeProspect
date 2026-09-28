import type { Json } from "@/types/database";

export type FinanceKind = "receivable" | "payable";
export type CompanyChoice = { id: string; name: string };
export type FinanceCategory = { id: string; name: string; kind: FinanceKind; active: boolean; version: number };
export type FinanceEntry = {
  id: string; type: FinanceKind; companyId: string; companyName: string; categoryId: string; categoryName: string;
  description: string; launchDate: string; dueDate: string; settlementDate: string | null; amountCents: number; paidCents: number; hasPayments: boolean;
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
export type FinanceMovement = {
  id: string; entryId: string; type: FinanceKind; companyId: string; companyName: string;
  categoryId: string; categoryName: string; description: string; dueDate: string; paidOn: string;
  amountCents: number; notes: string; actor: string; entry: FinanceEntry;
};
export type FinanceMovements = { month: string; kind: FinanceKind; movements: FinanceMovement[]; count: number; page: number; totalCents: number };
export type FinanceReversedMovement = FinanceMovement & { reversedOn: string; reverseReason: string; reverseActor: string };
export type FinanceReversedMovements = { month: string; movements: FinanceReversedMovement[]; count: number; page: number; totalCents: number };
export type FinanceSnapshot = {
  workspace: string; today: string; month: string; page: number; count: number;
  entries: FinanceEntry[]; categories: FinanceCategory[]; permissions: FinancePermissions;
  totals: { receivable: number; payable: number; received: number; paid: number; overdue: number; overdueCount: number; receivableOpenCount: number; payableOpenCount: number };
  monthly: { month: number; value?: number; receivable: number; payable: number }[]; expenses: { id: string; name: string; value: number }[];
  search: FinanceSearch;
};
export type FinanceDetail = {
  entry: FinanceEntry;
  payments: { id: string; amountCents: number; paidOn: string; notes: string; reversedAt: string | null; reverseReason: string | null; actor: string }[];
  history: { id: string; event: string; details: Json; createdAt: string; actor: string }[];
};
export type EntryInput = { id: string; version?: number; type: FinanceKind; companyId: string; categoryId: string; description: string; launchDate: string; dueDate: string; amountCents: number; notes: string };
export type FinanceResult<T> = { data: T; error?: never } | { error: string; data?: never };

