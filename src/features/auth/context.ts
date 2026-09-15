import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const requireUser = cache(async () => {
  const db = await createClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) redirect("/login");
  return { db, user };
});
export const getAccountIdentity = cache(async () => {
  const { db, user } = await requireUser();
  const { data, error } = await db.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  if (error) throw new Error("Não foi possível carregar seu perfil.");
  return { name: data?.full_name?.trim() || "Minha conta", email: user.email ?? "" };
});

export const getWorkspaceContext = cache(async () => {
  const { db, user } = await requireUser();
  const master = await db.rpc("is_lume_master");
  if (master.error) throw new Error("Não foi possível verificar seu acesso.");
  const isMaster = master.data === true;
  const selected = (await cookies()).get("lume-workspace")?.value;
  let options: {workspace_id:string;role:string;workspaces:{id:string;name:string}}[] = [];
  if (isMaster) {
    let query=db.from("workspaces").select("id,name");
    query=selected && /^[0-9a-f-]{36}$/i.test(selected) ? query.eq("id",selected) : query.eq("is_lume",true);
    const result=await query.maybeSingle();
    if(result.error) throw new Error("Não foi possível carregar o ambiente.");
    if(result.data) options=[{workspace_id:result.data.id,role:"owner",workspaces:result.data}];
  } else {
    const result=await db.from("workspace_members").select("workspace_id,role,workspaces(id,name)")
      .eq("user_id",user.id).eq("active",true);
    if(result.error) throw new Error("Não foi possível carregar sua empresa.");
    options=(result.data ?? []).flatMap(item=>item.workspaces ? [{...item,workspaces:item.workspaces}] : []);
  }
  const active=options[0] ?? null;
  return {db,user,options,active,isMaster};
});
export async function requireWorkspace() {
  const context = await getWorkspaceContext();
  if (!context.active) redirect("/onboarding");
  return { ...context, active: context.active };
}

export async function getTeam() {
  const context = await requireWorkspace();
  const { db, active } = context;
  const canManage = ["owner", "admin"].includes(active.role);
  const [members, invites] = await Promise.all([
    db.from("workspace_members").select("user_id,role,profiles(full_name)").eq("workspace_id", active.workspace_id).order("created_at"),
    canManage ? db.from("workspace_invites").select("id,email,role,expires_at,accepted_at,revoked_at").eq("workspace_id", active.workspace_id).order("created_at", { ascending:false }).limit(100) : Promise.resolve({ data: [], error: null }),
  ]);
  if (members.error || invites.error) throw new Error("Não foi possível carregar a equipe. Tente novamente.");
  return { ...context, canManage, members: members.data ?? [], invites: invites.data ?? [], now: Date.now() };
}
