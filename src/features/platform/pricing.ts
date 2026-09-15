import { products, type Product } from "./types";

// Values in cents. The four-module package totals R$ 150.00 per month.
export const monthlyPrices: Record<Product, number> = {
  crm: 3300,
  financeiro: 3300,
  agenda: 4200,
  prospeccao: 4200,
};

export function formatMonthlyPrice(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function getModulePlan(enabled: readonly string[]) {
  const selected = products.filter(([key]) => enabled.includes(key));
  const name = selected.length === 0 ? "Sem plano"
    : selected.length === products.length ? "Completo"
    : selected.length === 1 ? selected[0][1]
    : "Modular · " + selected.length + " módulos";
  return {
    name,
    description: selected.map(([, label]) => label).join(" + "),
    monthlyCents: selected.reduce((total, [key]) => total + monthlyPrices[key], 0),
  };
}
