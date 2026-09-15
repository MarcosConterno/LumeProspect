"use server";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser, requireWorkspace } from "./context";
import { selectWorkspace, type ActionState } from "./actions";

export async function createInvite(_previous: ActionState, form: FormData): Promise<ActionState> {
  const { db, active } = await requireWorkspace();
  if (form.get("workspace") !== active.workspace_id) return { error: "A empresa ativa mudou em outra aba. Recarregue esta página antes de salvar." };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const role = String(form.get("role") ?? "member");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { error: "Informe um e-mail válido." };
  if (!["owner","admin"].includes(active.role) || !["admin","member"].includes(role)) return { error: "Você não tem permissão para este convite." };
  const token = randomBytes(32).toString("hex");
  const { error } = await db.rpc("create_workspace_invite", { target: active.workspace_id, invite_email: email, invite_role: role, token });
  if (error) return { error: "Não foi possível criar o convite. Confira suas permissões e tente novamente." };
  revalidatePath("/configuracoes/equipe");
  return { message: `Convite criado para ${email}. Válido por 7 dias. Compartilhe o link com essa pessoa.`, link: `/convite/${token}` };
}
export async function acceptInvite(_previous: ActionState, form: FormData): Promise<ActionState> {
  const { db } = await requireUser();
  const token = String(form.get("token") ?? "");
  if (!/^[a-f0-9]{64}$/.test(token)) return { error: "Convite inválido." };
  const { data, error } = await db.rpc("accept_workspace_invite", { token });
  if (error || !data) return { error: "Convite indisponível: confira se está usando o e-mail convidado e confirmado. O link também pode ter expirado, sido usado ou revogado." };
  const selection = new FormData(); selection.set("workspace", data);
  await selectWorkspace(selection);
  return {};
}
export async function manageTeam(_previous: ActionState, form: FormData): Promise<ActionState> {
  const { db, active } = await requireWorkspace();
  if (form.get("workspace") !== active.workspace_id) return { error: "A empresa ativa mudou em outra aba. Recarregue esta página antes de salvar." };
  const operation = String(form.get("operation"));
  const id = String(form.get("id"));
  if (!/^[a-f0-9-]{36}$/.test(id)) return { error: "Registro inválido." };
  if (operation === "revoke") {
    const { error } = await db.rpc("revoke_workspace_invite", { invite_id: id });
    if (error) return { error: "Não foi possível revogar este convite." };
  } else if (operation === "remove") {
    const { data, error } = await db.from("workspace_members").delete().eq("workspace_id", active.workspace_id).eq("user_id", id).select("user_id");
    if (error || !data?.length) return { error: "Não foi possível remover. Confira a permissão e transfira os negócios atribuídos a essa pessoa antes de removê-la." };
  } else if (operation === "role") {
    const role = String(form.get("role"));
    if (!["admin", "member"].includes(role)) return { error: "Permissão inválida." };
    const { data, error } = await db.from("workspace_members").update({ role }).eq("workspace_id", active.workspace_id).eq("user_id", id).select("user_id");
    if (error || !data?.length) return { error: "Somente o proprietário pode alterar as permissões de outros membros." };
  } else return { error: "Operação inválida." };
  revalidatePath("/configuracoes/equipe");
  return { message: "Equipe atualizada." };
}
