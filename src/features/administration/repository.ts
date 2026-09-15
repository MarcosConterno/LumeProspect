import "server-only";
import { notFound } from "next/navigation";
import { requireModule } from "@/features/auth/module-access";
import { requireWorkspace } from "@/features/auth/context";
import { validId } from "./validation";
import type { RegistryKind, RegistryRow, Values } from "./types";

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
  const result = await db.from("companies").select("id,name,lifecycle_status")
    .eq("workspace_id", workspace).neq("lifecycle_status", "inactive")
    .ilike("name", pattern(query.trim().slice(0,100))).order("name").order("id").limit(20);
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
  let rows: RegistryRow[] = [];
  let count = 0;
  if (kind === "company") {
    let query = db.from("companies").select("id,name,document_number,location,lifecycle_status", { count: "exact" }).eq("workspace_id",workspace).ilike("name",pattern(q));
    if (status !== "all") query = query.eq("lifecycle_status",status);
    const result = await query.order("name").order("id").range(start,start+24);
    checkDatabase(result.error); count = result.count ?? 0;
    rows = (result.data ?? []).map(r => ({ id:r.id,name:r.name,detail:[r.document_number,r.location].filter(Boolean).join(" · "),status:r.lifecycle_status }));
  } else if (kind === "contact") {
    let query = db.from("contacts").select("id,name,email,role,active,companies(name)",{count:"exact"}).eq("workspace_id",workspace).ilike("name",pattern(q));
    if (status !== "all") query = query.eq("active",status === "active");
    const result = await query.order("name").order("id").range(start,start+24);
    checkDatabase(result.error); count = result.count ?? 0;
    rows = (result.data ?? []).map(r => ({ id:r.id,name:r.name,detail:[r.companies?.name,r.role,r.email].filter(Boolean).join(" · "),status:r.active ? "active":"inactive" }));
  } else {
    let query = db.from("services").select("id,name,description,active",{count:"exact"}).eq("workspace_id",workspace).ilike("name",pattern(q));
    if (status !== "all") query = query.eq("active",status === "active");
    const result = await query.order("name").order("id").range(start,start+24);
    checkDatabase(result.error); count = result.count ?? 0;
    rows = (result.data ?? []).map(r => ({ id:r.id,name:r.name,detail:r.description,status:r.active ? "active":"inactive" }));
  }
  const [createAccess,updateAccess] = await Promise.all([
    db.rpc("module_access",{target:workspace,product:"crm",operation:"create"}),
    db.rpc("module_access",{target:workspace,product:"crm",operation:"update"}),
  ]);
  checkDatabase(createAccess.error); checkDatabase(updateAccess.error);
  const edit = typeof params.edit === "string" ? params.edit : undefined;
  let record: Values | undefined;
  if (edit) {
    if (!/^[0-9a-f-]{36}$/i.test(edit)) notFound();
    const table = kind === "company" ? "companies" : kind === "contact" ? "contacts" : "services";
    const result = await db.from(table).select("*").eq("workspace_id",workspace).eq("id",validId(edit)).maybeSingle();
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
  return { workspace, q, status, page, count, rows, record, selectedCompany, canCreate:!!createAccess.data, canUpdate:!!updateAccess.data, showForm: !!edit || (params.new === "1" && !!createAccess.data) };
}

export async function getSettings() {
  const context = await administrationContext();
  const result = await context.db.from("workspaces").select("*").eq("id",context.active.workspace_id).single();
  checkDatabase(result.error);
  if (!result.data) throw new Error("Empresa indisponível.");
  return { ...context, record: result.data, canManage: ["owner","admin"].includes(context.active.role) };
}
export async function getProfile() {
  const context = await administrationContext();
  const result = await context.db.from("profiles").select("id,full_name,version").eq("id",context.user.id).single();
  checkDatabase(result.error);
  if (!result.data) throw new Error("Perfil indisponível.");
  return { ...context, record: result.data };
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
  return { name: active.workspaces?.name ?? "Sua empresa", counts: results.map(r => r.count ?? 0) };
}
