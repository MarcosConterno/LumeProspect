"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { check, crmContext, loadCrm, loadDeal } from "./data/repository";
import { text, uuid, validateActivity, validateDeal, validateFile, version } from "./data/validation";
import type { CrmResult, DealInput, ActivityStatus } from "./types";

async function perform<T>(work: () => Promise<T>): Promise<CrmResult<T>> {
  try { return { data: await work() }; }
  catch (error) {
    unstable_rethrow(error);
    return { error: error instanceof Error ? error.message : "Não foi possível concluir. Tente novamente." };
  }
}
function changed(data: unknown[] | null, error: { code?: string; message: string } | null) {
  check(error);
  if (!data?.length) throw new Error("Este registro foi alterado por outra pessoa ou não está mais disponível. Recarregue os dados antes de salvar.");
}
export async function refreshCrm(workspace: string) { return perform(() => loadCrm(workspace)); }
export async function readDeal(workspace: string, id: string) { return perform(() => loadDeal(workspace, id)); }

export async function saveDeal(workspace: string, input: DealInput, id?: string, expectedVersion?: number) {
  return perform(async () => {
    const { db } = await crmContext(workspace);
    const record = validateDeal(input);
    if (id) {
      const { data, error } = await db.from("deals").update(record).eq("workspace_id", workspace).eq("id", uuid(id)).eq("version", version(expectedVersion)).select("id");
      changed(data, error);
      revalidatePath("/crm");
      return { id };
    }
    const { data, error } = await db.from("deals").insert({ ...record, workspace_id: workspace }).select("id").single();
    check(error);
    if (!data) throw new Error("Não foi possível cadastrar o negócio.");
    revalidatePath("/crm");
    return data;
  });
}
export async function moveDeal(workspace: string, id: string, expectedVersion: number, stage: DealInput["stage"]) {
  return perform(async () => {
    const { db } = await crmContext(workspace);
    if (!["new", "contacted", "diagnosis", "proposal", "negotiation"].includes(stage)) throw new Error("Etapa inválida.");
    const { data, error } = await db.from("deals").update({ stage }).eq("workspace_id", workspace).eq("id", uuid(id)).eq("version", version(expectedVersion)).select("id");
    changed(data, error); revalidatePath("/crm"); return { id };
  });
}
export async function saveActivity(workspace: string, dealId: string, input: { title: string; type: string; description: string; scheduledAt: string }, id?: string, expectedVersion?: number) {
  return perform(async () => {
    const { db } = await crmContext(workspace);
    const record = validateActivity(input);
    if (id) {
      const { data, error } = await db.from("deal_activities").update(record).eq("workspace_id", workspace).eq("deal_id", uuid(dealId)).eq("id", uuid(id)).eq("version", version(expectedVersion)).select("id");
      changed(data, error);
    } else {
      const { error } = await db.from("deal_activities").insert({ ...record, workspace_id: workspace, deal_id: uuid(dealId) });
      check(error);
    }
    revalidatePath("/crm"); return { saved: true };
  });
}
export async function setActivityStatus(workspace: string, dealId: string, id: string, expectedVersion: number, status: ActivityStatus) {
  return perform(async () => {
    const { db } = await crmContext(workspace);
    if (!["pending", "completed"].includes(status)) throw new Error("Situação inválida.");
    const { data, error } = await db.from("deal_activities").update({ status }).eq("workspace_id", workspace).eq("deal_id", uuid(dealId)).eq("id", uuid(id)).eq("version", version(expectedVersion)).select("id");
    changed(data, error); revalidatePath("/crm"); return { saved: true };
  });
}
export async function saveNote(workspace: string, dealId: string, body: string, id?: string, expectedVersion?: number) {
  return perform(async () => {
    const { db } = await crmContext(workspace);
    const value = text(body, "Nota", 20000);
    if (id) {
      const { data, error } = await db.from("deal_notes").update({ body: value }).eq("workspace_id", workspace).eq("deal_id", uuid(dealId)).eq("id", uuid(id)).eq("version", version(expectedVersion)).select("id");
      changed(data, error); revalidatePath("/crm"); return { id };
    }
    const { data, error } = await db.from("deal_notes").insert({ workspace_id: workspace, deal_id: uuid(dealId), body: value }).select("id").single();
    check(error);
    if (!data) throw new Error("Não foi possível salvar a nota.");
    revalidatePath("/crm"); return data;
  });
}
export async function deleteNote(workspace: string, dealId: string, id: string, expectedVersion: number) {
  return perform(async () => {
    const { db } = await crmContext(workspace);
    const { data, error } = await db.from("deal_notes").delete().eq("workspace_id", workspace).eq("deal_id", uuid(dealId)).eq("id", uuid(id)).eq("version", version(expectedVersion)).select("id");
    if (error?.code === "23503") throw new Error("Remova os anexos desta nota antes de excluí-la.");
    changed(data, error); revalidatePath("/crm"); return { removed: true };
  });
}

export async function createCrmRecord(workspace: string, kind: "company" | "contact" | "service", input: { name: string; companyId?: string; role?: string; email?: string; phone?: string; location?: string }) {
  return perform(async () => {
    const { db } = await crmContext(workspace);
    const name = text(input.name, "Nome", 200);
    let id: string;
    if (kind === "company") {
      const result = await db.from("companies").insert({ workspace_id: workspace, name, location: text(input.location ?? "", "Localização", 200, false) || null }).select("id").single();
      check(result.error); if (!result.data) throw new Error("Não foi possível cadastrar a empresa."); id = result.data.id;
    } else if (kind === "contact") {
      const email = text(input.email ?? "", "E-mail", 254, false);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-mail inválido.");
      const result = await db.from("contacts").insert({ workspace_id: workspace, company_id: uuid(input.companyId), name, role: text(input.role ?? "", "Cargo", 200, false) || null, email: email || null, phone: text(input.phone ?? "", "Telefone", 40, false) || null }).select("id").single();
      check(result.error); if (!result.data) throw new Error("Não foi possível cadastrar o contato."); id = result.data.id;
    } else if (kind === "service") {
      const result = await db.from("services").insert({ workspace_id: workspace, name }).select("id").single();
      check(result.error); if (!result.data) throw new Error("Não foi possível cadastrar o serviço."); id = result.data.id;
    } else throw new Error("Cadastro inválido.");
    revalidatePath("/crm"); return { id };
  });
}

export async function beginFileUpload(workspace: string, dealId: string, name: string, size: number, noteId?: string) {
  return perform(async () => {
    const { db } = await crmContext(workspace);
    const file = validateFile(name, size);
    const id = randomUUID();
    const path = `${workspace}/${uuid(dealId)}/${id}`;
    const { error } = await db.from("deal_files").insert({ id, workspace_id: workspace, deal_id: dealId, note_id: noteId ? uuid(noteId) : null, original_name: file.name, storage_path: path, content_type: file.contentType, size_bytes: size });
    check(error); return { id, path, contentType: file.contentType };
  });
}
export async function finishFileUpload(workspace: string, dealId: string, id: string) {
  return perform(async () => {
    const { db, user } = await crmContext(workspace);
    const { data: file, error } = await db.from("deal_files").select("storage_path,size_bytes,created_by,status").eq("workspace_id", workspace).eq("deal_id", uuid(dealId)).eq("id", uuid(id)).single();
    check(error);
    if (!file || file.created_by !== user.id) throw new Error("Upload não encontrado para este usuário.");
    const info = await db.storage.from("crm-files").info(file.storage_path);
    if (info.error || info.data?.size !== Number(file.size_bytes)) throw new Error("O envio ainda não foi concluído ou o tamanho diverge. Tente concluir novamente ou remova o envio pendente.");
    const result = await db.from("deal_files").update({ status: "ready" }).eq("workspace_id", workspace).eq("deal_id", dealId).eq("id", id).select("id");
    changed(result.data, result.error); revalidatePath("/crm"); return { id };
  });
}
export async function removeFile(workspace: string, dealId: string, id: string) {
  return perform(async () => {
    const { db, user, active } = await crmContext(workspace);
    const result = await db.from("deal_files").select("storage_path,created_by").eq("workspace_id", workspace).eq("deal_id", uuid(dealId)).eq("id", uuid(id)).single();
    check(result.error);
    const file = result.data;
    if (!file || (file.created_by !== user.id && !["owner", "admin"].includes(active.role))) throw new Error("Somente o autor ou um administrador pode remover o arquivo.");
    const removed = await db.storage.from("crm-files").remove([file.storage_path]);
    if (removed.error) throw new Error("Não foi possível remover o arquivo. Tente novamente.");
    const deleted = await db.from("deal_files").delete().eq("workspace_id", workspace).eq("deal_id", dealId).eq("id", id).select("id");
    changed(deleted.data, deleted.error); revalidatePath("/crm"); return { removed: true };
  });
}
