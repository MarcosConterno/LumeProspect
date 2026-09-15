import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireMaster } from "@/features/platform/repository";

export function authAdminConfigured() {
  return Boolean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function createAuthAdmin() {
  await requireMaster();
  const key=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  if(!key || !url) throw new Error("Configure SUPABASE_SECRET_KEY no servidor para habilitar a criação de usuários pela Lume.");
  return createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
}
