import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireUserManager } from "@/features/platform/user-access";

export function authAdminConfigured() {
  return Boolean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function createAuthAdmin(workspace: string, scope: "company" | "master") {
  await requireUserManager(workspace, scope);
  const key=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  if(!key || !url) throw new Error("A criação de usuários precisa ser habilitada pela Lume na configuração do servidor.");
  return createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
}
