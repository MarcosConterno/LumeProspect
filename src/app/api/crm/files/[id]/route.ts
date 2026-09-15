import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/features/crm/data/validation";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };
  let id: string;
  let workspace: string;
  try { id = uuid((await params).id); workspace = uuid(request.nextUrl.searchParams.get("workspace")); }
  catch { return NextResponse.json({ error: "Arquivo inválido." }, { status: 400, headers }); }
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Entre novamente para acessar o arquivo." }, { status: 401, headers });
  // RLS checks membership in the requested workspace, even if the active tab changes.
  const { data: file, error } = await db.from("deal_files").select("storage_path,original_name").eq("workspace_id", workspace).eq("id", id).eq("status", "ready").single();
  if (error || !file) return NextResponse.json({ error: "Arquivo não encontrado ou sem permissão." }, { status: 404, headers });
  const { data, error: signError } = await db.storage.from("crm-files").createSignedUrl(file.storage_path, 60, request.nextUrl.searchParams.get("download") === "1" ? { download: file.original_name } : undefined);
  if (signError || !data) return NextResponse.json({ error: "Não foi possível abrir o arquivo." }, { status: 503, headers });
  return NextResponse.redirect(data.signedUrl, { status: 307, headers });
}
