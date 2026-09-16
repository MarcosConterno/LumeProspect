import "server-only";
import { notFound, redirect } from "next/navigation";
import { requireUser, requireWorkspace } from "@/features/auth/context";
import { validId } from "@/features/administration/validation";

function withInviteStatus<T extends { accepted_at: string | null; revoked_at: string | null; expires_at: string }>(invites: T[]) {
  const now = Date.now();
  return invites.map(invite => ({
    ...invite,
    statusLabel: invite.accepted_at ? "Aceito" : invite.revoked_at ? "Revogado" : new Date(invite.expires_at).getTime() <= now ? "Expirado" : "Pendente",
  }));
}

export function platformError(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (error.code === "40001") throw new Error("Os dados mudaram. Recarregue a página antes de salvar.");
  if (error.message?.includes("last master")) throw new Error("A Lume precisa manter pelo menos um master.");
  if (error.message?.includes("last company")) throw new Error("A empresa precisa manter pelo menos um administrador ativo.");
  if (error.message?.includes("already belongs") || error.message?.includes("another company")) throw new Error("Esta pessoa já pertence a outra empresa.");
  if (error.code === "42501") throw new Error("Seu acesso não permite esta operação ou a conta está protegida.");
  if (error.code === "23514" || error.code === "23505") throw new Error("Confira os dados e os vínculos existentes antes de continuar.");
  throw new Error("Não foi possível concluir a operação. Tente novamente.");
}
export async function requireMaster() {
  const context = await requireUser();
  const result = await context.db.rpc("is_lume_master");
  platformError(result.error);
  if (!result.data) redirect("/dashboard");
  return context;
}
export async function loadPlatform(q: string, page: number) {
  const context = await requireMaster();
  const { db } = context;
  const result = await db.from("workspaces").select("id,name,status,is_lume,created_at", {count:"exact"})
    .ilike("name","%" + q.replace(/[\\%_]/g,"\\$&") + "%").order("is_lume",{ascending:false}).order("name").order("id")
    .range((page-1)*25,page*25-1);
  platformError(result.error);
  return { ...context, rows:result.data ?? [],count:result.count ?? 0 };
}
export async function loadClient(id: string) {
  const { db } = await requireMaster();
  try { validId(id); } catch { notFound(); }
  const [workspace,modules,invites,audit] = await Promise.all([
    db.from("workspaces").select("*").eq("id",id).maybeSingle(),
    db.from("workspace_modules").select("module,enabled").eq("workspace_id",id),
    db.from("workspace_invites").select("id,email,role,accepted_at,revoked_at,expires_at").eq("workspace_id",id).order("created_at",{ascending:false}).limit(30),
    db.from("admin_audit").select("id,event,details,created_at,actor_id,profiles(full_name)").eq("workspace_id",id).order("created_at",{ascending:false}).limit(30),
  ]);
  [workspace,modules,invites,audit].forEach(r=>platformError(r.error));
  if (!workspace.data) notFound();
  return {workspace:workspace.data,modules:modules.data ?? [],invites:withInviteStatus(invites.data ?? []),audit:audit.data ?? []};
}
export async function loadMasters() {
  const { db,user } = await requireMaster();
  const [masters,home] = await Promise.all([
    db.rpc("list_masters"),
    db.from("workspaces").select("id").eq("is_lume",true).single(),
  ]);
  platformError(masters.error); platformError(home.error);
  const invites=home.data ? await db.from("workspace_invites").select("id,email,role,accepted_at,revoked_at,expires_at").eq("workspace_id",home.data.id).eq("role","master").order("created_at",{ascending:false}).limit(30) : {data:[],error:null};
  platformError(invites.error);
  return {masters:masters.data ?? [],home:home.data?.id,user,invites:withInviteStatus(invites.data ?? [])};
}
export async function loadMemberSettings() {
  const context = await requireWorkspace();
  const { db,active } = context;
  const canManage=["owner","admin"].includes(active.role);
  const [members,permissions,modules,invites] = await Promise.all([
    db.from("workspace_members").select("user_id,role,active,profiles(full_name)").eq("workspace_id",active.workspace_id).order("created_at"),
    canManage ? db.from("member_permissions").select("*").eq("workspace_id",active.workspace_id) : Promise.resolve({data:[],error:null}),
    db.from("workspace_modules").select("module,enabled").eq("workspace_id",active.workspace_id),
    canManage ? db.from("workspace_invites").select("id,email,role,accepted_at,revoked_at,expires_at").eq("workspace_id",active.workspace_id).order("created_at",{ascending:false}).limit(30) : Promise.resolve({data:[],error:null}),
  ]);
  [members,permissions,modules,invites].forEach(r=>platformError(r.error));
  const masters=context.isMaster ? await db.rpc("list_masters") : {data:[],error:null};
  platformError(masters.error);
  return {...context,canManage,members:members.data ?? [],permissions:permissions.data ?? [],modules:modules.data ?? [],invites:withInviteStatus(invites.data ?? []),masterIds:(masters.data ?? []).map(m=>m.user_id)};
}
