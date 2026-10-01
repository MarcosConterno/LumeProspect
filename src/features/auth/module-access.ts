import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { requireWorkspace } from "./context";
import { products, type Product } from "@/features/platform/types";

type ModuleOperation = "read" | "create" | "update" | "delete" | "settle" | "reverse";
type ModuleAccess = Record<ModuleOperation, boolean>;

const getModuleState = cache(async () => {
  const context = await requireWorkspace();
  if (context.isMaster) {
    return {
      context,
      access: Object.fromEntries(products.map(([key]) => [key, {
        read: true,
        create: true,
        update: true,
        delete: true,
        settle: true,
        reverse: true,
      }])) as Record<Product, ModuleAccess>,
    };
  }

  const { db, active, user } = context;
  const [licenses, permissions] = await Promise.all([
    db.from("workspace_modules").select("module,enabled").eq("workspace_id", active.workspace_id),
    db.from("member_permissions").select("module,can_read,can_create,can_update,can_delete,can_settle,can_reverse")
      .eq("workspace_id", active.workspace_id).eq("user_id", user.id),
  ]);
  if (licenses.error || permissions.error) throw new Error("Não foi possível carregar os módulos.");

  const elevated = active.role === "owner" || active.role === "admin";
  const access = Object.fromEntries(products.map(([key]) => {
    const enabled = licenses.data?.some(item => item.module === key && item.enabled) ?? false;
    const permission = permissions.data?.find(item => item.module === key);
    return [key, {
      read: enabled && (elevated || permission?.can_read === true),
      create: enabled && (elevated || permission?.can_create === true),
      update: enabled && (elevated || permission?.can_update === true),
      delete: enabled && (elevated || permission?.can_delete === true),
      settle: enabled && (elevated || permission?.can_settle === true),
      reverse: enabled && (elevated || permission?.can_reverse === true),
    }];
  })) as Record<Product, ModuleAccess>;
  return { context, access };
});

export const availableModules = cache(async () => {
  const { access } = await getModuleState();
  return products.filter(([key]) => access[key].read).map(([key]) => key);
});

export async function hasModuleAccess(product: Product, operation: ModuleOperation = "read") {
  const { access } = await getModuleState();
  return access[product][operation];
}

export async function requireModule(product: Product, operation: ModuleOperation = "read") {
  const { context, access } = await getModuleState();
  if (!access[product][operation]) redirect("/configuracoes?denied=1");
  return context;
}

