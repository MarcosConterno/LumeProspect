import type { DealStage, DealStageId } from "@/features/crm/types";

export const dealStages: DealStage[] = [
  { id: "new", label: "Novo", probability: 10, staleAfterDays: 2 },
  { id: "contacted", label: "Contato iniciado", probability: 20, staleAfterDays: 3 },
  { id: "diagnosis", label: "Reunião / Diagnóstico", probability: 40, staleAfterDays: 5 },
  { id: "proposal", label: "Proposta enviada", probability: 60, staleAfterDays: 5 },
  { id: "negotiation", label: "Negociação", probability: 80, staleAfterDays: 7 },
];

export const activityTypeLabels = {
  call: "Ligação",
  whatsapp: "WhatsApp",
  email: "E-mail",
  meeting: "Reunião",
  follow_up: "Follow-up",
  proposal: "Proposta",
  task: "Tarefa",
  note: "Nota",
} as const;

export function getStage(stageId: DealStageId) {
  return dealStages.find((stage) => stage.id === stageId) ?? dealStages[0];
}
