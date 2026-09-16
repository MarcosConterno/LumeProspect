export const products = [
  ["crm","CRM"],["financeiro","Financeiro"],["agenda","Agenda"],["prospeccao","Prospecção"],
] as const;
export type Product = typeof products[number][0];
export type PlatformState = { error?: string; message?: string; link?: string; inviteEmail?: string };
export type MemberPermission = { module: string; can_read: boolean; can_create: boolean; can_update: boolean; can_delete: boolean; can_settle: boolean; can_reverse: boolean };
