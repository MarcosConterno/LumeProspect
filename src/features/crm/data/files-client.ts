"use client";
import { createClient } from "@/lib/supabase/client";
import { beginFileUpload, finishFileUpload, removeFile } from "../actions";
import { validateFile } from "./validation";

// Upload goes directly to private Storage, avoiding Server Action body-size limits.
export async function uploadDealFile(workspace: string, dealId: string, file: File, noteId?: string) {
  validateFile(file.name, file.size);
  const started = await beginFileUpload(workspace, dealId, file.name, file.size, noteId);
  if (started.error) throw new Error(started.error);
  const record = started.data!;
  const db = createClient();
  const result = await db.storage.from("crm-files").upload(record.path, file, { contentType: record.contentType, upsert: false });
  if (result.error) {
    const cleanup = await removeFile(workspace, dealId, record.id);
    throw new Error(cleanup.error ? "O envio falhou. Há um envio pendente na lista; remova-o antes de tentar novamente." : "Não foi possível enviar o arquivo. Confira a conexão e tente novamente.");
  }
  const completed = await finishFileUpload(workspace, dealId, record.id);
  if (completed.error) throw new Error(completed.error);
}
