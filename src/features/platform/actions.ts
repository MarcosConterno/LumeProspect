"use server";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { requireMaster, platformError } from "./repository";
import { requireWorkspace } from "@/features/auth/context";
import { products, type PlatformState } from "./types";
import { validId } from "@/features/administration/validation";

export async function platformAction(operation: string,target: string | null,_previous: PlatformState,form: FormData): Promise<PlatformState> {
  let created: string | undefined;
  try {
    const { db }=await requireMaster();
    if(target) validId(target);
    if(operation==="revoke_invite" && target) {
      const result=await db.rpc("revoke_workspace_invite",{invite_id:target});
      platformError(result.error); revalidatePath("/lume","layout");
      return {message:"Convite revogado."};
    }
    if(operation==="invite_admin" || operation==="invite_master") {
      const token=randomBytes(32).toString("hex");
      const email=String(form.get("email") ?? "").trim().toLowerCase();
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>254) return {error:"Informe um e-mail válido."};
      if(operation==="invite_admin") {
        if(!target) return {error:"Selecione a empresa."};
        const result=await db.rpc("create_workspace_invite",{target,invite_email:email,invite_role:"admin",token});
        platformError(result.error);
      } else {
        const result=await db.rpc("platform_manage",{operation:"invite_master",target:target!,payload:{email,token}});
        platformError(result.error);
      }
      revalidatePath("/lume","layout");
      return {message:(operation==="invite_master" ? "Link de acesso master gerado. " : "Link de acesso administrador gerado. ")+"Nenhum e-mail foi enviado. Copie e compartilhe o link com a pessoa. Ela precisa entrar com o e-mail convidado e clicar em Aceitar. Válido por 7 dias.",link:"/convite/"+token,inviteEmail:email};
    }
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
    const {db,active}=await requireWorkspace();
    if(active.workspace_id!==workspace) return {error:"A empresa ativa mudou. Recarregue esta página."};
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
