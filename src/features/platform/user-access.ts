import "server-only";
import { getWorkspaceContext } from "@/features/auth/context";
import { validId } from "@/features/administration/validation";
import { requireMaster } from "./repository";
import { managesUsers } from "./roles";

export async function requireUserManager(workspace: string, scope: "company" | "master") {
  validId(workspace);
  if (scope === "master") return requireMaster();
  const context = await getWorkspaceContext();
  if (!context.isMaster && (!context.active || context.active.workspace_id !== workspace || !managesUsers(context.active.role))) {
    throw new Error("Você não pode gerenciar usuários desta empresa.");
  }
  return context;
}
