import "server-only";
import { notFound } from "next/navigation";
import { hasModuleAccess, requireModule } from "@/features/auth/module-access";
import { getCurrentProfile, requireWorkspace } from "@/features/auth/context";
import { validId } from "./validation";
import { managesUsers } from "@/features/platform/roles";
import type { RegistryKind, RegistryRow, Values } from "./types";

type ClientDetailParams = { editar?: string; editContato?: string };

export async function administrationContext(expected?: string) {
  const context = await requireWorkspace();
  if (expected && context.active.workspace_id !== expected) {
    throw new Error("A empresa ativa mudou em outra aba. Recarregue antes de salvar.");
  }
  return context;
}
export function checkDatabase(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === "23505") throw new Error("Já existe um cadastro com esse nome ou documento nesta empresa.");
  if (error.code === "23503") throw new Error("Este cadastro possui vínculos. Confira a empresa selecionada e os negócios relacionados.");
  if (error.code === "23514") throw new Error("Confira os campos e selecione cadastros ativos para novos vínculos.");
  if (error.code === "42501") throw new Error("Você não tem permissão para esta alteração.");
  throw new Error("Não foi possível acessar os dados. Tente novamente.");
}
export function toValues(record: object): Values {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, value == null ? "" : String(value)]));
}
function pattern(q: string) { return "%" + q.replace(/[\\%_]/g, "\\$&") + "%"; }
export async function companyOptions(workspace: string, query: string) {
  await requireModule("crm");
  const { db } = await administrationContext(workspace);
  const q = query.trim().slice(0,100);
  let request = db.from("companies").select("id,name,lifecycle_status")
    .eq("workspace_id", workspace).neq("lifecycle_status", "inactive");
  if (q) request = request.ilike("name", pattern(q));
  const result = await request.order("name").order("id").limit(20);
  checkDatabase(result.error);
  return result.data ?? [];
}
export async function getRegistry(kind: RegistryKind, params: Record<string, string | string[] | undefined>) {
  await requireModule("crm");
  const context = await administrationContext();
  const { db, active } = context;
  const workspace = active.workspace_id;
  const q = typeof params.q === "string" ? params.q.trim().slice(0,100) : "";
  const allowed = kind === "company" ? ["all","prospect","customer","inactive"] : ["all","active","inactive"];
  const status = typeof params.status === "string" && allowed.includes(params.status) ? params.status : "all";
  const requested = typeof params.page === "string" ? Number(params.page) : 1;
  const page = Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, 100000) : 1;
  const start = (page - 1) * 25;
  const accessPromise = Promise.all([
    hasModuleAccess("crm", "create"),
    hasModuleAccess("crm", "update"),
  ]);
  let rows: RegistryRow[] = [];
  let count = 0;
  if (kind === "company") {
    let query = db.from("companies").select("id,name,document_number,location,lifecycle_status", { count: "exact" }).eq("workspace_id",workspace);
    if (q) query = query.ilike("name",pattern(q));
    if (status !== "all") query = query.eq("lifecycle_status",status);
    const result = await query.order("name").order("id").range(start,start+24);
    checkDatabase(result.error); count = result.count ?? 0;
    rows = (result.data ?? []).map(r => ({ id:r.id,name:r.name,detail:[r.document_number,r.location].filter(Boolean).join(" · "),status:r.lifecycle_status }));
  } else if (kind === "contact") {
    let query = db.from("contacts").select("id,name,email,role,active,companies(name)",{count:"exact"}).eq("workspace_id",workspace);
    if (q) query = query.ilike("name",pattern(q));
    if (status !== "all") query = query.eq("active",status === "active");
    const result = await query.order("name").order("id").range(start,start+24);
    checkDatabase(result.error); count = result.count ?? 0;
    rows = (result.data ?? []).map(r => ({ id:r.id,name:r.name,detail:[r.companies?.name,r.role,r.email].filter(Boolean).join(" · "),status:r.active ? "active":"inactive" }));
  } else {
    let query = db.from("services").select("id,name,description,active",{count:"exact"}).eq("workspace_id",workspace);
    if (q) query = query.ilike("name",pattern(q));
    if (status !== "all") query = query.eq("active",status === "active");
    const result = await query.order("name").order("id").range(start,start+24);
    checkDatabase(result.error); count = result.count ?? 0;
    rows = (result.data ?? []).map(r => ({ id:r.id,name:r.name,detail:r.description,status:r.active ? "active":"inactive" }));
  }
  const [canCreate,canUpdate] = await accessPromise;
  const edit = typeof params.edit === "string" ? params.edit : undefined;
  let record: Values | undefined;
  if (edit) {
    if (!/^[0-9a-f-]{36}$/i.test(edit)) notFound();
    const table = kind === "company" ? "companies" : kind === "contact" ? "contacts" : "services";
    const selection = kind === "company"
      ? "id,name,legal_name,document_number,segment,location,website,employee_range,revenue_range,lifecycle_status,version"
      : kind === "contact"
        ? "id,workspace_id,company_id,name,role,email,phone,website,linkedin_url,active,version"
        : "id,workspace_id,name,description,active,version";
    const result = await db.from(table).select(selection).eq("workspace_id",workspace).eq("id",validId(edit)).maybeSingle();
    checkDatabase(result.error);
    if (!result.data) notFound();
    record = toValues(result.data);
  }
  let selectedCompany = null;
  const companyId = kind === "contact" ? record?.company_id : undefined;
  if (companyId) {
    const result = await db.from("companies").select("id,name,lifecycle_status").eq("workspace_id",workspace).eq("id",companyId).maybeSingle();
    checkDatabase(result.error); selectedCompany = result.data;
  }
  return { workspace, q, status, page, count, rows, record, selectedCompany, canCreate, canUpdate, showForm: !!edit || (params.new === "1" && canCreate) };
}

export async function getClientDetail(id: string, params: ClientDetailParams) {
  const context = await requireModule("crm");
  const { db, active } = context;
  validId(id);
  const [companyResult, contactsResult, createAccess, updateAccess] = await Promise.all([
    db.from("companies").select("id,workspace_id,name,legal_name,document_number,segment,location,website,employee_range,revenue_range,lifecycle_status,version").eq("workspace_id", active.workspace_id).eq("id", id).maybeSingle(),
    db.from("contacts").select("id,name,email,phone,role,website,linkedin_url,active,version,company_id").eq("workspace_id", active.workspace_id).eq("company_id", id).order("active", { ascending: false }).order("name").order("id"),
    hasModuleAccess("crm", "create"),
    hasModuleAccess("crm", "update"),
  ]);
  checkDatabase(companyResult.error); checkDatabase(contactsResult.error);
  if (!companyResult.data) notFound();
  const editContact = typeof params.editContato === "string" ? params.editContato : undefined;
  let contactRecord: Values | undefined;
  if (editContact) {
    validId(editContact);
    const selectedContact = (contactsResult.data ?? []).find(contact => contact.id === editContact);
    if (!selectedContact) notFound();
    contactRecord = toValues(selectedContact);
  }
  const selectedCompany = { id: companyResult.data.id, name: companyResult.data.name, lifecycle_status: companyResult.data.lifecycle_status };
  return {
    ...context,
    company: companyResult.data,
    contacts: contactsResult.data ?? [],
    contactRecord,
    selectedCompany,
    canCreate: createAccess,
    canUpdate: updateAccess,
    editingCompany: params.editar === "1",
  };
}

export async function getSettings() {
  const context = await administrationContext();
  const result = await context.db.from("workspaces").select("id,name,legal_name,document_number,contact_email,phone,location,status,version").eq("id",context.active.workspace_id).single();
  checkDatabase(result.error);
  if (!result.data) throw new Error("Empresa indisponível.");
  return { ...context, record: result.data, canManage: ["owner","admin"].includes(context.active.role) };
}
export async function getProfile() {
  const context = await administrationContext();
  const record = await getCurrentProfile();
  if (!record) throw new Error("Perfil indisponível.");
  return { ...context, record };
}
export async function getAdministrationSummary() {
  const context = await administrationContext();
  const { db, active } = context;
  const results = await Promise.all([
    db.from("companies").select("id",{count:"exact",head:true}).eq("workspace_id",active.workspace_id).neq("lifecycle_status","inactive"),
    db.from("contacts").select("id",{count:"exact",head:true}).eq("workspace_id",active.workspace_id).eq("active",true),
    db.from("services").select("id",{count:"exact",head:true}).eq("workspace_id",active.workspace_id).eq("active",true),
    db.from("workspace_members").select("user_id",{count:"exact",head:true}).eq("workspace_id",active.workspace_id),
  ]);
  results.forEach(r => checkDatabase(r.error));
  return { name: active.workspaces?.name ?? "Sua empresa", counts: results.map(r => r.count ?? 0), canManageUsers: context.isMaster || managesUsers(active.role) };
}
