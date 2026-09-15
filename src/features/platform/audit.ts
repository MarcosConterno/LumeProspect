import type { Json } from "@/types/database";
const tables:Record<string,string>={workspaces:"Dados da empresa",workspace_members:"Acesso de usuário",workspace_modules:"Módulo",member_permissions:"Permissões",workspace_invites:"Convite"};
const productNames:Record<string,string>={crm:"CRM",financeiro:"Financeiro",agenda:"Agenda",prospeccao:"Prospecção"};
const verbs:Record<string,string>={insert:"cadastrado",update:"atualizado",delete:"removido"};
export function auditDescription(event:string,details:Json) {
  if(event === "user.assigned_by_master") return "Usuário vinculado à empresa pelo master";
  const fixed:Record<string,string>={"master.granted":"Acesso master concedido","master.revoked":"Acesso master revogado","master.entered_workspace":"Master acessou este ambiente"};
  if(fixed[event]) return fixed[event];
  const [table,operation]=event.split(".");
  let extra="";
  if(details && typeof details==="object" && !Array.isArray(details)) {
    const after=details.after;
    if(after && typeof after==="object" && !Array.isArray(after)) {
      if(table==="workspace_modules") extra=" · "+(productNames[String(after.module)] ?? "Módulo")+(after.enabled?" liberado":" bloqueado");
      if(table==="workspace_invites") extra=" · "+String(after.email ?? "")+(after.accepted_at?" · aceito":after.revoked_at?" · revogado":"");
      if(table==="workspace_members") extra=" · "+(after.active?"ativo":"inativo");
    }
  }
  return (tables[table] ?? "Configuração")+" "+(verbs[operation] ?? "alterado")+extra;
}
