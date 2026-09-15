import { activityTypeLabels, dealStages } from "../constants";
import type { DealInput } from "../types";

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const FILE_TYPES: Record<string, string> = {
  pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  txt: "text/plain", csv: "text/csv",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};
export const FILE_ACCEPT = Object.keys(FILE_TYPES).map((extension) => `.${extension}`).join(",");
export function uuid(value: unknown): string {
  if (typeof value !== "string" || !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(value)) throw new Error("Registro inválido. Atualize a página.");
  return value;
}
export function text(value: unknown, label: string, max: number, required = true): string {
  if (typeof value !== "string" || value.trim().length > max || (required && !value.trim())) throw new Error(`${label}: preencha corretamente (até ${max} caracteres).`);
  return value.trim();
}
export function version(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) throw new Error("Versão inválida. Atualize os dados antes de salvar.");
  return value;
}
export function date(value: string): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new Error("Informe uma data válida.");
  return value;
}
export function validateDeal(input: DealInput) {
  if (!input || typeof input !== "object") throw new Error("Negócio inválido.");
  const name = text(input.name, "Nome do negócio", 200);
  const company_id = uuid(input.companyId);
  if (!Number.isFinite(input.value) || input.value < 0 || input.value > 9999999999.99 || Math.abs(input.value * 100 - Math.round(input.value * 100)) > 0.0001) throw new Error("Informe um valor válido, com até duas casas decimais.");
  if (!dealStages.some((stage) => stage.id === input.stage)) throw new Error("Etapa inválida.");
  if (!["open", "won", "lost"].includes(input.status)) throw new Error("Situação inválida.");
  return {
    name, company_id, value: input.value, stage: input.stage, status: input.status,
    contact_id: input.contactId ? uuid(input.contactId) : null,
    service_id: input.serviceId ? uuid(input.serviceId) : null,
    owner_id: input.ownerId ? uuid(input.ownerId) : null,
    expected_close_date: date(input.expectedCloseDate),
    summary: text(input.summary, "Resumo", 20000, false),
    lost_reason: input.status === "lost" ? text(input.lostReason, "Motivo da perda", 2000) : null,
  };
}
export function validateActivity(input: { title: string; type: string; description: string; scheduledAt: string }) {
  if (!Object.hasOwn(activityTypeLabels, input.type)) throw new Error("Tipo de atividade inválido.");
  const scheduled = input.scheduledAt ? new Date(input.scheduledAt) : null;
  if (scheduled && !Number.isFinite(scheduled.getTime())) throw new Error("Data da atividade inválida.");
  return { title: text(input.title, "Título", 300), type: input.type, description: text(input.description, "Descrição", 10000, false), scheduled_at: scheduled?.toISOString() ?? null };
}
export function validateFile(name: string, size: number) {
  const cleanName = text(name, "Nome do arquivo", 240);
  if (Array.from(cleanName).some((character) => character.charCodeAt(0) < 32 || character === "/" || character === "\\")) throw new Error("Nome de arquivo inválido.");
  const extension = cleanName.split(".").pop()?.toLowerCase() ?? "";
  const contentType = FILE_TYPES[extension];
  if (!contentType) throw new Error("Use PDF, imagem (JPG, PNG, WebP), TXT, CSV, DOCX, XLSX ou PPTX.");
  if (!Number.isSafeInteger(size) || size < 1 || size > MAX_FILE_SIZE) throw new Error("O arquivo deve ter entre 1 byte e 10 MB.");
  return { name: cleanName, contentType };
}
