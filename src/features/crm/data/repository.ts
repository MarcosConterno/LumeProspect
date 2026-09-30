import "server-only";
import { requireWorkspace } from "@/features/auth/context";
import { requireModule } from "@/features/auth/module-access";
import type { Database } from "@/types/database";
import type { CrmCompany, CrmContact, CrmSnapshot, CrmOptions, Deal, DealActivity, DealDetail } from "../types";
import { uuid } from "./validation";

type DealRow = Pick<Database["public"]["Tables"]["deals"]["Row"],
  "id" | "workspace_id" | "name" | "version" | "company_id" | "prospect_id" | "contact_id" |
  "service_id" | "owner_id" | "value" | "stage" | "status" | "expected_close_date" | "score" |
  "stage_entered_at" | "created_at" | "updated_at" | "summary" | "lost_reason">;
type ActivityRow = Pick<Database["public"]["Tables"]["deal_activities"]["Row"],
  "id" | "deal_id" | "type" | "title" | "description" | "scheduled_at" | "completed_at" |
  "status" | "version" | "created_at">;
type DealRelationRow = DealRow & {
  companies: Pick<CrmCompany, "name" | "location" | "employee_range"> | null;
  contacts: Pick<CrmContact, "name" | "role" | "email" | "phone"> | null;
  services: { id: string; name: string; active: boolean } | null;
  workspace_members: { user_id: string; profiles: { full_name: string | null } | null } | null;
};
type Db = Awaited<ReturnType<typeof requireWorkspace>>["db"];

export async function crmContext(expectedWorkspace?: string) {
  const context = await requireModule("crm");
  if (expectedWorkspace && uuid(expectedWorkspace) !== context.active.workspace_id) throw new Error("A empresa ativa mudou. Recarregue a página antes de continuar.");
  return context;
}
export function check(error: { code?: string; message: string } | null) {
  if (!error) return;
  if (error.code === "23503") throw new Error("O vínculo não está disponível nesta empresa. Confira empresa, contato, serviço e responsável.");
  if (error.code === "23505") throw new Error("Este cadastro já existe. Selecione o registro existente.");
  if (error.code === "42501") throw new Error("Você não tem permissão para realizar esta operação.");
  if (error.code === "23514") throw new Error("Os dados não atendem às regras do cadastro. Confira os campos e o upload.");
  throw new Error("Não foi possível acessar os dados. Tente novamente. Se persistir, confira a conexão com o Supabase.");
}

// Supabase limits each response. Read every page instead of silently omitting records.
async function allRows<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { code?: string; message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await fetchPage(offset, offset + 499);
    check(result.error);
    const batch = result.data ?? [];
    rows.push(...batch);
    if (batch.length < 500) return rows;
  }
}
async function optionsFor(db: Db, workspace: string): Promise<CrmOptions> {
  const [companies, contacts, services, members] = await Promise.all([
    allRows((from, to) => db.from("companies").select("id,name,location,employee_range").eq("workspace_id", workspace).order("id").range(from, to)),
    allRows((from, to) => db.from("contacts").select("id,company_id,name,role,email,phone").eq("workspace_id", workspace).order("id").range(from, to)),
    allRows((from, to) => db.from("services").select("id,name,active").eq("workspace_id", workspace).order("id").range(from, to)),
    allRows((from, to) => db.from("workspace_members").select("user_id,profiles(full_name)").eq("workspace_id", workspace).order("user_id").range(from, to)),
  ]);
  return { companies: companies.sort((a, b) => a.name.localeCompare(b.name)), contacts: contacts.sort((a, b) => a.name.localeCompare(b.name)), services: services.sort((a, b) => a.name.localeCompare(b.name)), owners: members.map((member) => ({ id: member.user_id, name: member.profiles?.full_name || "Membro da equipe" })) };
}
export async function loadCrmOptions(expectedWorkspace?: string): Promise<CrmOptions> {
  const { db, active } = await crmContext(expectedWorkspace);
  return optionsFor(db, active.workspace_id);
}
function optionsFromDeals(rows: DealRelationRow[]): CrmOptions {
  const companies = new Map<string, CrmCompany>();
  const contacts = new Map<string, CrmContact>();
  const services = new Map<string, { id: string; name: string; active: boolean }>();
  const owners = new Map<string, { id: string; name: string }>();
  for (const row of rows) {
    if (row.company_id && row.companies) companies.set(row.company_id, { id: row.company_id, name: row.companies.name, location: row.companies.location, employee_range: row.companies.employee_range });
    if (row.contact_id && row.contacts && row.company_id) contacts.set(row.contact_id, { id: row.contact_id, company_id: row.company_id, name: row.contacts.name, role: row.contacts.role, email: row.contacts.email, phone: row.contacts.phone });
    if (row.service_id && row.services) services.set(row.service_id, row.services);
    if (row.owner_id && row.workspace_members) owners.set(row.owner_id, { id: row.owner_id, name: row.workspace_members.profiles?.full_name || "Membro da equipe" });
  }
  return { companies: [...companies.values()].sort((a, b) => a.name.localeCompare(b.name)), contacts: [...contacts.values()].sort((a, b) => a.name.localeCompare(b.name)), services: [...services.values()].sort((a, b) => a.name.localeCompare(b.name)), owners: [...owners.values()].sort((a, b) => a.name.localeCompare(b.name)) };
}
function indexOptions(options: CrmOptions) {
  return {
    companies: new Map(options.companies.map((item) => [item.id, item] as const)),
    contacts: new Map(options.contacts.map((item) => [item.id, item] as const)),
    services: new Map(options.services.map((item) => [item.id, item] as const)),
    owners: new Map(options.owners.map((item) => [item.id, item] as const)),
  };
}
export function mapActivity(row: ActivityRow): DealActivity {
  return { id: row.id, dealId: row.deal_id, type: row.type as DealActivity["type"], title: row.title, description: row.description, scheduledAt: row.scheduled_at ?? undefined, completedAt: row.completed_at ?? undefined, status: row.status as DealActivity["status"], version: row.version, createdAt: row.created_at };
}
function mapDeal(row: DealRow, options: ReturnType<typeof indexOptions>, next?: ActivityRow): Deal {
  const company = row.company_id ? options.companies.get(row.company_id) : undefined;
  const contact = row.contact_id ? options.contacts.get(row.contact_id) : undefined;
  const service = row.service_id ? options.services.get(row.service_id) : undefined;
  const owner = row.owner_id ? options.owners.get(row.owner_id) : undefined;
  return { id: row.id, name: row.name, workspaceId: row.workspace_id, version: row.version, companyId: row.company_id ?? undefined, prospectId: row.prospect_id ?? undefined, companyName: company?.name ?? row.name, companyLocation: company?.location ?? undefined, companySize: company?.employee_range ?? undefined, contactId: row.contact_id ?? undefined, contactName: contact?.name ?? "Sem contato", contactRole: contact?.role ?? "", contactEmail: contact?.email ?? undefined, contactPhone: contact?.phone ?? undefined, serviceId: row.service_id ?? undefined, serviceName: service?.name ?? "Sem serviço", ownerId: row.owner_id ?? undefined, ownerName: owner?.name ?? "Sem responsável", value: Number(row.value), stage: row.stage as Deal["stage"], status: row.status as Deal["status"], expectedCloseDate: row.expected_close_date ?? "", score: row.score, stageEnteredAt: row.stage_entered_at, createdAt: row.created_at, updatedAt: row.updated_at, summary: row.summary, lostReason: row.lost_reason ?? undefined, nextActivity: next ? mapActivity(next) : undefined };
}
export async function loadCrm(expectedWorkspace?: string): Promise<CrmSnapshot> {
  const { db, active, user } = await crmContext(expectedWorkspace);
  const workspace = active.workspace_id;
  const dealSelection = "id,workspace_id,name,version,company_id,prospect_id,contact_id,service_id,owner_id,value,stage,status,expected_close_date,score,stage_entered_at,created_at,updated_at,summary,lost_reason,companies!deals_company_tenant_fk(name,location,employee_range),contacts!deals_contact_tenant_fk(name,role,email,phone),services!deals_service_tenant_fk(id,name,active),workspace_members!deals_owner_tenant_fk(user_id,profiles(full_name))";
  const activitySelection = "id,deal_id,type,title,description,scheduled_at,completed_at,status,version,created_at";
  const [rows, pending] = await Promise.all([
    allRows((from, to) => db.from("deals").select(dealSelection).eq("workspace_id", workspace).eq("status", "open").order("position").order("id").range(from, to)),
    allRows((from, to) => db.from("deal_activities").select(activitySelection).eq("workspace_id", workspace).eq("status", "pending").order("scheduled_at", { nullsFirst: false }).order("id").range(from, to)),
  ]);
  const relationRows = rows as unknown as DealRelationRow[];
  const options = optionsFromDeals(relationRows);
  const nextByDeal = new Map<string, ActivityRow>();
  for (const activity of pending) if (!nextByDeal.has(activity.deal_id)) nextByDeal.set(activity.deal_id, activity);
  const indexedOptions = indexOptions(options);
  return { deals: relationRows.map((row) => mapDeal(row, indexedOptions, nextByDeal.get(row.id))), options, optionsComplete: false, workspaceId: workspace, userId: user.id, role: active.role };
}
export async function loadDeal(workspace: string, id: string): Promise<DealDetail> {
  const { db } = await crmContext(workspace);
  uuid(id);
  const dealSelection = "id,workspace_id,name,version,company_id,prospect_id,contact_id,service_id,owner_id,value,stage,status,expected_close_date,score,stage_entered_at,created_at,updated_at,summary,lost_reason";
  const activitySelection = "id,deal_id,type,title,description,scheduled_at,completed_at,status,version,created_at";
  const [record, options, activities, notes, files] = await Promise.all([
    db.from("deals").select(dealSelection).eq("workspace_id", workspace).eq("id", id).single(),
    optionsFor(db, workspace),
    allRows((from, to) => db.from("deal_activities").select(activitySelection).eq("workspace_id", workspace).eq("deal_id", id).order("scheduled_at", { nullsFirst: false }).order("id").range(from, to)),
    allRows((from, to) => db.from("deal_notes").select("id,body,created_by,created_at,updated_at,version").eq("workspace_id", workspace).eq("deal_id", id).order("created_at", { ascending: false }).order("id").range(from, to)),
    allRows((from, to) => db.from("deal_files").select("id,note_id,original_name,content_type,size_bytes,status,created_by,created_at,version").eq("workspace_id", workspace).eq("deal_id", id).order("created_at", { ascending: false }).order("id").range(from, to)),
  ]);
  check(record.error);
  if (!record.data) throw new Error("Negócio não encontrado nesta empresa.");
  return { deal: mapDeal(record.data, indexOptions(options), activities.find((activity) => activity.status === "pending")), activities: activities.map(mapActivity), notes, files };
}
