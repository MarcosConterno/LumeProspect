import "server-only";
import { notFound, redirect } from "next/navigation";
import { getWorkspaceContext } from "@/features/auth/context";
import { validId } from "@/features/administration/validation";
import { managesUsers } from "./roles";

export function platformError(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (error.code === "40001") throw new Error("Os dados mudaram. Recarregue a página antes de salvar.");
  if (error.message?.includes("last master")) throw new Error("A Lume precisa manter pelo menos um master.");
  if (error.message?.includes("last company")) throw new Error("A empresa precisa manter pelo menos um administrador ativo.");
  if (error.message?.includes("already belongs") || error.message?.includes("another company")) throw new Error("Esta pessoa já pertence a outra empresa.");
  if (error.message?.includes("Cannot delegate unavailable permission")) throw new Error("Gerentes só podem conceder permissões que também possuem. Revise as opções selecionadas.");
  if (error.message?.includes("Manager may only manage members")) throw new Error("Gerentes só podem cadastrar e gerenciar usuários comuns.");
  if (error.code === "42501") throw new Error("Seu acesso não permite esta operação ou a conta está protegida.");
  if (error.code === "23514" || error.code === "23505") throw new Error("Confira os dados e os vínculos existentes antes de continuar.");
  throw new Error("Não foi possível concluir a operação. Tente novamente.");
}
export async function requireMaster() {
  const context = await getWorkspaceContext();
  if (!context.isMaster) redirect("/configuracoes");
  return context;
}
export async function loadPlatform(q: string, page: number) {
  const context = await requireMaster();
  const { db } = context;
  let query = db.from("workspaces").select("id,name,status,is_lume,created_at", {count:"exact"}).eq("is_lume",false);
  if (q) query = query.ilike("name","%" + q.replace(/[\\%_]/g,"\\$&") + "%");
  const result = await query.order("name").order("id").range((page-1)*25,page*25-1);
  platformError(result.error);
  return { ...context, rows:result.data ?? [],count:result.count ?? 0 };
}
export async function loadClient(id: string) {
  const { db } = await requireMaster();
  try { validId(id); } catch { notFound(); }
  const [workspace,modules,audit] = await Promise.all([
    db.from("workspaces").select("id,name,status,is_lume,version,created_at,updated_at").eq("id",id).maybeSingle(),
    db.from("workspace_modules").select("module,enabled").eq("workspace_id",id),
    db.from("admin_audit").select("id,event,details,created_at,actor_id,profiles(full_name)").eq("workspace_id",id).order("created_at",{ascending:false}).limit(30),
  ]);
  [workspace,modules,audit].forEach(r=>platformError(r.error));
  if (!workspace.data) notFound();
  return {workspace:workspace.data,modules:modules.data ?? [],audit:audit.data ?? []};
}
export async function loadMasters() {
  const { db,user } = await requireMaster();
  const [masters,home] = await Promise.all([
    db.rpc("list_masters"),
    db.from("workspaces").select("id").eq("is_lume",true).single(),
  ]);
  platformError(masters.error); platformError(home.error);
  return {masters:masters.data ?? [],home:home.data?.id,user};
}
export async function loadMemberSettings(requested?: string, page = 1) {
  const context = await getWorkspaceContext();
  if (!context.isMaster && (!context.active || !managesUsers(context.active.role))) redirect("/configuracoes?denied=users");
  const { db } = context;
  const target = context.isMaster && requested ? validId(requested) : context.active?.workspace_id;
  if (!target) redirect("/lume");
  const company = await db.from("workspaces").select("id,name,status").eq("id",target).maybeSingle();
  platformError(company.error);
  if (!company.data) notFound();
  const active = { workspace_id: target, role: context.isMaster ? "owner" : context.active!.role, workspaces: company.data };
  const [members,modules,masters] = await Promise.all([
    db.from("workspace_members").select("user_id,role,active,profiles(full_name)",{count:"exact"}).eq("workspace_id",target).order("created_at").order("user_id").range((page-1)*25,page*25-1),
    db.from("workspace_modules").select("module,enabled").eq("workspace_id",target),
    context.isMaster ? db.rpc("list_masters") : Promise.resolve({data:[],error:null}),
  ]);
  [members,modules,masters].forEach(r=>platformError(r.error));
  const people=[...new Set([context.user.id,...(members.data ?? []).map(member=>member.user_id)])];
  const permissions=await db.from("member_permissions").select("workspace_id,user_id,module,can_read,can_create,can_update,can_delete,can_settle,can_reverse").eq("workspace_id",target).in("user_id",people);
  platformError(permissions.error);
  return {...context,active,canManage:true,members:members.data ?? [],count:members.count ?? 0,page,
    permissions:permissions.data ?? [],modules:modules.data ?? [],masterIds:(masters.data ?? []).map(m=>m.user_id)};
}
