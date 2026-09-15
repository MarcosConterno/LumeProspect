export const dealStages = ["Novo", "Contatado", "Reunião marcada", "Fechado"] as const;

export type DealStage = (typeof dealStages)[number];

export type Deal = {
  id: number;
  name: string;
  value: number;
  stage: DealStage;
  prospectId: number | null;
};

export const initialDeals: Deal[] = [
  { id: 1, name: "DataBridge Sistemas", value: 5400, stage: "Novo", prospectId: 4 },
  { id: 2, name: "Amplia Agência de Marketing", value: 4200, stage: "Novo", prospectId: 3 },
  { id: 3, name: "Vértice Consultoria & Gestão", value: 6200, stage: "Contatado", prospectId: 2 },
  { id: 4, name: "Stratos RH Inteligente", value: 3800, stage: "Contatado", prospectId: 5 },
  { id: 5, name: "Nexus Soluções Digitais", value: 8500, stage: "Reunião marcada", prospectId: 1 },
  { id: 6, name: "BrandLab Consultoria", value: 9800, stage: "Fechado", prospectId: null },
];

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}
