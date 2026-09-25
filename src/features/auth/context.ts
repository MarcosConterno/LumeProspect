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
export const getCurrentProfile = cache(async () => {
  const { db, user } = await requireUser();
  const { data, error } = await db.from("profiles").select("id,full_name,version").eq("id", user.id).maybeSingle();
  if (error) throw new Error("Não foi possível carregar seu perfil.");
  return data;
});
export const getAccountIdentity = cache(async () => {
  const [{ user }, profile] = await Promise.all([requireUser(), getCurrentProfile()]);
  return { name: profile?.full_name?.trim() || "Minha conta", email: user.email ?? "" };
});

export const getWorkspaceContext = cache(async () => {
  const { db, user } = await requireUser();
  const master = await db.rpc("is_lume_master");
  if (master.error) throw new Error("Não foi possível verificar seu acesso.");
  const isMaster = master.data === true;
  const selected = (await cookies()).get("lume-workspace")?.value;
  let options: {workspace_id:string;role:string;workspaces:{id:string;name:string;is_lume:boolean}}[] = [];
  if (isMaster) {
    let query=db.from("workspaces").select("id,name,is_lume");
    query=selected && /^[0-9a-f-]{36}$/i.test(selected) ? query.eq("id",selected) : query.eq("is_lume",true);
    const result=await query.maybeSingle();
    if(result.error) throw new Error("Não foi possível carregar o ambiente.");
    if(result.data) options=[{workspace_id:result.data.id,role:"owner",workspaces:result.data}];
  } else {
    const result=await db.from("workspace_members").select("workspace_id,role,workspaces(id,name,is_lume)")
      .eq("user_id",user.id).eq("active",true).maybeSingle();
    if(result.error) throw new Error("Não foi possível carregar sua empresa.");
    options=result.data?.workspaces ? [{...result.data,workspaces:result.data.workspaces}] : [];
  }
  const active=options[0] ?? null;
  return {db,user,options,active,isMaster};
});
export async function requireWorkspace() {
  const context = await getWorkspaceContext();
  if (!context.active) redirect("/onboarding");
  return { ...context, active: context.active };
}
