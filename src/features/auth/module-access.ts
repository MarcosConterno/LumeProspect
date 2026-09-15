import "server-only";
import { redirect } from "next/navigation";
import { requireWorkspace } from "./context";
import { products, type Product } from "@/features/platform/types";

export async function requireModule(product: Product, operation="read") {
  const context=await requireWorkspace();
  const result=await context.db.rpc("module_access",{target:context.active.workspace_id,product,operation});
  if(result.error) throw new Error("Não foi possível verificar o acesso ao módulo.");
  if(!result.data) redirect("/dashboard?denied=1");
  return context;
}
export async function availableModules() {
  const context=await requireWorkspace();
  if(context.isMaster) return products.map(([key])=>key);
  const {db,active,user}=context;
  const [licenses,permissions]=await Promise.all([
    db.from("workspace_modules").select("module,enabled").eq("workspace_id",active.workspace_id),
    db.from("member_permissions").select("module,can_read").eq("workspace_id",active.workspace_id).eq("user_id",user.id),
  ]);
  if(licenses.error||permissions.error) throw new Error("Não foi possível carregar os módulos.");
  return products.filter(([key])=>licenses.data?.some(m=>m.module===key&&m.enabled)&&
    (["owner","admin"].includes(active.role)||permissions.data?.some(p=>p.module===key&&p.can_read))).map(([key])=>key);
}

