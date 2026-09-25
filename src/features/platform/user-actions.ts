"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { createAuthAdmin } from "@/lib/supabase/admin";
import { authErrorMessage } from "@/features/auth/errors";
import { validId } from "@/features/administration/validation";
import { platformError } from "./repository";
import { requireUserManager } from "./user-access";
import type { PlatformState } from "./types";

function assignmentError(error:{code?:string;message?:string}|null) {
  if(error && ["PGRST202","42883"].includes(error.code ?? "")) throw new Error("Aplique as atualizações de cadastro direto e configurações centralizadas antes de cadastrar usuários.");
  if(error?.message?.includes("Account not found")) throw new Error("Não há conta com esse e-mail. Use Criar usuário.");
  if(error?.message?.includes("Account email not confirmed")) throw new Error("Esta conta ainda precisa confirmar o e-mail. Use Reenviar confirmação na tela de acesso.");
  if(error?.message?.includes("Active company required")) throw new Error("Selecione uma empresa ativa para atribuir o usuário.");
  platformError(error);
}

export async function savePlatformUser(workspace:string,scope:"company"|"master",_previous:PlatformState,form:FormData):Promise<PlatformState> {
  let created=false;
  try {
    if(scope!=="company" && scope!=="master") return {error:"Operação inválida."};
    const {db}=await requireUserManager(workspace,scope);
    validId(workspace);
    const mode=String(form.get("mode"));
    const email=String(form.get("email") ?? "").trim().toLowerCase();
    const role=scope==="master" ? "master" : String(form.get("role"));
    if(!["create","assign"].includes(mode) || (scope==="company" && !["admin","manager","member"].includes(role))) return {error:"Operação ou perfil inválido."};
    if(email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return {error:"Informe um e-mail válido."};
    const inspected=await db.rpc("assign_managed_user",{target:workspace,address:email,member_role:role,check_only:true});
    assignmentError(inspected.error);
    if(!inspected.data || typeof inspected.data!=="object" || Array.isArray(inspected.data)) throw new Error("Não foi possível conferir o cadastro.");
    if(mode==="create") {
      if(inspected.data.userId) return {error:"Esse e-mail já possui uma conta. Use Vincular conta existente; a senha atual será preservada."};
      const name=String(form.get("name") ?? "").trim();
      const password=String(form.get("password") ?? "");
      if(name.length<2 || name.length>120) return {error:"Informe um nome com 2 a 120 caracteres."};
      if(password.length<8 || password.length>128) return {error:"Use uma senha inicial com 8 a 128 caracteres."};
      if(password!==form.get("confirmPassword")) return {error:"As senhas não coincidem."};
      const admin=await createAuthAdmin(workspace,scope);
      const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:name}});
      if(error || !data.user) {
        if(error?.code==="email_exists" || error?.code==="user_already_exists") return {error:"A conta já existe. Use Vincular conta existente."};
        return {error:authErrorMessage(error ?? {},"Não foi possível criar a conta. Confira a chave administrativa e os logs do Auth. Se a conta aparecer em Users, use Vincular conta existente.")};
      }
      created=true;
    }
    const result=await db.rpc("assign_managed_user",{target:workspace,address:email,member_role:role});
    assignmentError(result.error);
    if(!result.data || typeof result.data!=="object" || Array.isArray(result.data) || result.data.assigned!==true) throw new Error("Não foi possível confirmar o vínculo. Confira o cadastro antes de tentar novamente.");
    revalidatePath("/", "layout");
    const already=result.data.alreadyAssigned===true;
    if(scope==="master") return {message:already ? "Esta conta já possui acesso master Lume." : "Acesso master concedido. A pessoa já pode entrar e administrar todas as empresas e módulos."};
    return {message:already ? "Esta conta já pertence à empresa. O perfil e as permissões existentes foram mantidos. Para alterá-los, use Editar papel e permissões na lista de usuários." : created ? "Usuário criado e atribuído à empresa. Já pode entrar com o e-mail e a senha inicial definidos." : "Conta vinculada à empresa. A pessoa pode entrar com sua senha atual."};
  } catch(error) {
    unstable_rethrow(error);
    const message=error instanceof Error ? error.message : "Não foi possível concluir o cadastro.";
    return {error:created ? "A conta foi criada, mas o vínculo não foi concluído. "+message+" Após resolver, use Vincular conta existente com o mesmo e-mail." : message};
  }
}
