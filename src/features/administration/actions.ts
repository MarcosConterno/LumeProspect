"use server";

import { requireModule } from "@/features/auth/module-access";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { administrationContext, checkDatabase, companyOptions } from "./repository";
import { validId, validateValues } from "./validation";
import { fields, registryConfig, type SaveState, type SaveTarget } from "./types";

export async function searchCompanies(workspace: string, query: string) {
  try { return { data: await companyOptions(workspace, query) }; }
  catch (error) {
    unstable_rethrow(error);
    return { error: error instanceof Error ? error.message : "Não foi possível buscar empresas." };
  }
}

export async function saveMaster(target: SaveTarget, _previous: SaveState, form: FormData): Promise<SaveState> {
  let destination = "";
  try {
    if (!Object.hasOwn(fields, target.kind)) throw new Error("Cadastro inválido.");
    const { db, active, user } = await administrationContext(target.workspace);
    if (["company","contact","service"].includes(target.kind)) await requireModule("crm",target.id ? "update" : "create");
    const values = validateValues(target.kind, form);
    const workspace = active.workspace_id;
    if (target.id) {
      validId(target.id);
      if (!Number.isSafeInteger(target.version) || target.version! < 1) throw new Error("Recarregue o cadastro antes de salvar.");
    }
    const optional = (key: string) => values[key] || null;
    let result: { data: { id: string }[] | null; error: { code?: string } | null };
    if (target.kind === "company") {
      const record = { name: values.name, legal_name: optional("legal_name"), document_number: optional("document_number"),
        website: optional("website"), segment: optional("segment"), location: optional("location"),
        employee_range: optional("employee_range"), revenue_range: optional("revenue_range"), lifecycle_status: values.lifecycle_status };
      result = target.id
        ? await db.from("companies").update(record).eq("workspace_id",workspace).eq("id",target.id).eq("version",target.version!).select("id")
        : await db.from("companies").insert({ ...record, workspace_id:workspace }).select("id");
      destination = registryConfig.company.path;
    } else if (target.kind === "contact") {
      const record = { name:values.name, company_id:values.company_id, role:optional("role"), email:optional("email"),
        phone:optional("phone"), website:optional("website"), linkedin_url:optional("linkedin_url"), active:values.active === "true" };
      result = target.id
        ? await db.from("contacts").update(record).eq("workspace_id",workspace).eq("id",target.id).eq("version",target.version!).select("id")
        : await db.from("contacts").insert({ ...record, workspace_id:workspace }).select("id");
      destination = registryConfig.contact.path;
    } else if (target.kind === "service") {
      const record = { name:values.name, description:values.description, active:values.active === "true" };
      result = target.id
        ? await db.from("services").update(record).eq("workspace_id",workspace).eq("id",target.id).eq("version",target.version!).select("id")
        : await db.from("services").insert({ ...record, workspace_id:workspace }).select("id");
      destination = registryConfig.service.path;
    } else if (target.kind === "workspace") {
      if (!["owner","admin"].includes(active.role) || target.id !== workspace) throw new Error("Somente o proprietário e administradores podem editar a empresa.");
      result = await db.from("workspaces").update({ name:values.name, legal_name:optional("legal_name"),
        document_number:optional("document_number"), contact_email:optional("contact_email"), phone:optional("phone"), location:optional("location") })
        .eq("id",workspace).eq("version",target.version!).select("id");
      destination = "/configuracoes/empresa";
    } else {
      if (target.id !== user.id) throw new Error("Você só pode editar seu próprio perfil.");
      result = await db.from("profiles").update({ full_name:values.full_name }).eq("id",user.id).eq("version",target.version!).select("id");
      destination = "/perfil";
    }
    checkDatabase(result.error);
    if (!result.data?.length) throw new Error("O cadastro foi alterado por outra pessoa ou ficou indisponível. Recarregue a página e confira os dados antes de tentar novamente.");
    revalidatePath("/", "layout");
  } catch (error) {
    unstable_rethrow(error);
    return { error: error instanceof Error ? error.message : "Não foi possível salvar o cadastro." };
  }
  redirect(destination + "?saved=1");
}
