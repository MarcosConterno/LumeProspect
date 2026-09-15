import { fields, type RecordKind, type Values } from "./types";

export function validId(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error("Registro inválido.");
  }
  return value;
}

export function validateValues(kind: RecordKind, form: FormData): Values {
  const values: Values = {};
  for (const field of fields[kind]) {
    const value = String(form.get(field.name) ?? "").trim();
    if ((field.required && value.length < 2) || value.length > (field.maxLength ?? 200)) {
      throw new Error(`Confira o campo “${field.label}” e seu tamanho.`);
    }
    if (field.options && !field.options.some(([key]) => key === value)) throw new Error("Situação inválida.");
    if (value && field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new Error("Informe um e-mail válido.");
    }
    if (value && field.type === "url") {
      try {
        const url = new URL(value);
        if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error();
      } catch { throw new Error("Informe um endereço de site válido, começando com https://."); }
    }
    values[field.name] = value;
  }
  if ("document_number" in values) {
    const document = values.document_number;
    if (document && (!/^[\d.\-/\s]+$/.test(document) || ![11,14].includes(document.replace(/\D/g, "").length))) {
      throw new Error("O CPF deve conter 11 dígitos; o CNPJ, 14.");
    }
    values.document_number = document.replace(/\D/g, "");
  }
  if (kind === "contact") values.company_id = validId(String(form.get("company_id") ?? ""));
  return values;
}

