"use server";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { requireMaster, platformError } from "./repository";
import { requireUserManager } from "./user-access";
import { products, type PlatformState } from "./types";
import { validId } from "@/features/administration/validation";

export async function platformAction(operation: string,target: string | null,_previous: PlatformState,form: FormData): Promise<PlatformState> {
  let created: string | undefined;
  try {
    const { db }=await requireMaster();
    if(target) validId(target);
    if(!["create_client","configure_client","remove_master"].includes(operation)) return {error:"Operação inválida."};
    const name=String(form.get("name") ?? "").trim();
    if(operation!=="remove_master" && (name.length<2 || name.length>160)) return {error:"Informe um nome com 2 a 160 caracteres."};
    if(operation==="remove_master" && form.get("confirm")!=="on") return {error:"Confirme a remoção do acesso master."};
    const modules=Object.fromEntries(products.map(([key])=>[key,form.get(key)==="on"]));
    const result=await db.rpc("platform_manage",{operation,target:target!,payload:{name,status:String(form.get("status") ?? "active"),modules,version:Number(form.get("version"))}});
    platformError(result.error);
    if(operation==="create_client" && result.data && typeof result.data==="object" && !Array.isArray(result.data) && typeof result.data.id==="string") created=result.data.id;
    revalidatePath("/","layout");
    if(!created) return {message:"Alteração salva."};
  } catch(error) {
    unstable_rethrow(error);
    return {error:error instanceof Error ? error.message : "Não foi possível salvar."};
  }
  redirect("/lume/clientes/"+created);
}
export async function saveMember(workspace: string,person: string,_previous: PlatformState,form: FormData): Promise<PlatformState> {
  try {
    const {db}=await requireUserManager(workspace,"company");
    const permissions=products.map(([module])=>{
      const read=form.get(module+"_read")==="on";
      return {module,read,create:read&&form.get(module+"_create")==="on",update:read&&form.get(module+"_update")==="on",delete:read&&form.get(module+"_delete")==="on",settle:read&&module==="financeiro"&&form.get(module+"_settle")==="on",reverse:read&&module==="financeiro"&&form.get(module+"_reverse")==="on"};
    });
    const result=await db.rpc("manage_member",{target:workspace,person:validId(person),member_role:String(form.get("role")),enabled:form.get("active")==="on",permissions});
    platformError(result.error); revalidatePath("/","layout");
    return {message:"Permissões atualizadas."};
  } catch(error) {
    unstable_rethrow(error);
    return {error:error instanceof Error ? error.message : "Não foi possível salvar."};
  }
}
