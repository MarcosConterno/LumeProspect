export type RecordKind = "company" | "contact" | "service" | "workspace" | "profile";
export type RegistryKind = "company" | "contact" | "service";
export type Values = Record<string, string>;
export type SaveState = { error?: string };
export type SaveTarget = { kind: RecordKind; workspace: string; id?: string; version?: number };
export type CompanyOption = { id: string; name: string; lifecycle_status: string };
export type RegistryRow = { id: string; name: string; detail: string; status: string };
export type FieldDefinition = {
  name: string; label: string; type?: "text" | "email" | "url" | "textarea" | "select";
  required?: boolean; maxLength?: number; options?: readonly (readonly [string, string])[];
};
export const registryConfig = {
  company: { path: "/clientes", title: "Clientes e empresas", singular: "empresa", description: "Empresas atendidas pelo CRM, cadastradas independentemente da prospecção." },
  contact: { path: "/contatos", title: "Contatos", singular: "contato", description: "Pessoas de contato vinculadas às empresas atendidas." },
  service: { path: "/servicos", title: "Serviços", singular: "serviço", description: "Catálogo de serviços para os negócios do CRM." },
} as const;
export const fields: Record<RecordKind, readonly FieldDefinition[]> = {
  company: [
    { name: "name", label: "Nome da empresa", required: true, maxLength: 200 },
    { name: "legal_name", label: "Razão social", maxLength: 200 },
    { name: "document_number", label: "CPF ou CNPJ (opcional)", maxLength: 20 },
    { name: "segment", label: "Segmento", maxLength: 120 },
    { name: "location", label: "Cidade / UF", maxLength: 200 },
    { name: "website", label: "Site (https://…)", type: "url", maxLength: 500 },
    { name: "employee_range", label: "Faixa de funcionários", maxLength: 80 },
    { name: "revenue_range", label: "Faixa de faturamento", maxLength: 80 },
    { name: "lifecycle_status", label: "Situação", type: "select", options: [["prospect","Em negociação"],["customer","Cliente"],["inactive","Inativa"]] },
  ],
  contact: [
    { name: "name", label: "Nome completo", required: true, maxLength: 200 },
    { name: "role", label: "Cargo", maxLength: 120 },
    { name: "email", label: "E-mail", type: "email", maxLength: 254 },
    { name: "phone", label: "Telefone / WhatsApp", maxLength: 40 },
    { name: "website", label: "Site (https://…)", type: "url", maxLength: 500 },
    { name: "linkedin_url", label: "LinkedIn (https://…)", type: "url", maxLength: 500 },
    { name: "active", label: "Situação", type: "select", options: [["true","Ativo"],["false","Inativo"]] },
  ],
  service: [
    { name: "name", label: "Nome do serviço", required: true, maxLength: 200 },
    { name: "description", label: "Descrição", type: "textarea", maxLength: 4000 },
    { name: "active", label: "Situação", type: "select", options: [["true","Ativo"],["false","Inativo"]] },
  ],
  workspace: [
    { name: "name", label: "Nome da sua empresa", required: true, maxLength: 160 },
    { name: "legal_name", label: "Razão social", maxLength: 200 },
    { name: "document_number", label: "CPF ou CNPJ (opcional)", maxLength: 20 },
    { name: "contact_email", label: "E-mail comercial", type: "email", maxLength: 254 },
    { name: "phone", label: "Telefone", maxLength: 40 },
    { name: "location", label: "Cidade / UF", maxLength: 200 },
  ],
  profile: [{ name: "full_name", label: "Seu nome", required: true, maxLength: 160 }],
};

