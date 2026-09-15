"use client";
import { useActionState, useState } from "react";
import { platformAction, saveMember } from "../actions";
import { products, type PlatformState, type MemberPermission } from "../types";
import { formatMonthlyPrice, getModulePlan, monthlyPrices } from "../pricing";
const input="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm";
const button="rounded-lg bg-accent px-4 py-2 text-sm text-white disabled:opacity-50";
function Feedback({state}:{state:PlatformState}) {
  const [copied,setCopied]=useState(false);
  return <div className="space-y-2 text-sm">{state.error&&<p role="alert" className="text-red-700">{state.error}</p>}{state.message&&<p role="status">{state.message}</p>}{state.link&&<div className="space-y-2"><a href={state.link} className="block underline">Abrir convite</a><button type="button" className="underline" onClick={async()=>{try{await navigator.clipboard.writeText(new URL(state.link!,window.location.origin).href);setCopied(true);}catch{setCopied(false);}}}>{copied?"Link copiado":"Copiar link"}</button></div>}</div>;
}
export function ClientForm({workspace,modules=[]}:{workspace?:{id:string;name:string;status:string;version:number;is_lume:boolean};modules?:{module:string;enabled:boolean}[]}) {
  const [name,setName]=useState(workspace?.name ?? "");
  const [status,setStatus]=useState(workspace?.status ?? "active");
  const [enabled,setEnabled]=useState<string[]>(modules.filter(m=>m.enabled).map(m=>m.module));
  const plan = getModulePlan(enabled);
  const [state,action,pending]=useActionState(platformAction.bind(null,workspace?"configure_client":"create_client",workspace?.id ?? null),{});
  return <form action={action} className="space-y-4"><fieldset disabled={pending} className="space-y-4">
    <label className="block text-sm">Nome da empresa<input name="name" required minLength={2} maxLength={160} value={name} onChange={e=>setName(e.target.value)} className={input}/></label>
    {workspace&&<><input type="hidden" name="version" value={workspace.version}/><label className="block text-sm">Situação<select name="status" value={status} onChange={e=>setStatus(e.target.value)} className={input}><option value="active">Ativa</option>{!workspace.is_lume&&<option value="suspended">Suspensa</option>}</select></label>
    <section aria-label="Plano e mensalidade" aria-live="polite" aria-atomic="true" className="space-y-3 rounded-xl border border-border bg-[var(--accent-soft)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs text-[var(--ink-soft)]">Tipo de plano</p><p className="mt-1 font-semibold text-accent-dark">{plan.name}</p></div>
        <div><p className="text-xs text-[var(--ink-soft)]">Total mensal selecionado</p><output className="mt-1 block font-display text-3xl text-accent-dark">{formatMonthlyPrice(plan.monthlyCents)}<span className="font-sans text-xs"> /mês</span></output></div>
      </div>
      <p className="text-xs text-[var(--ink-soft)]">{plan.description || "Selecione os módulos para montar o plano."}</p>
    </section>
    <fieldset className="space-y-3"><legend className="mb-2 font-medium">Módulos liberados</legend>{products.map(([key,label])=><label key={key} className="flex flex-wrap items-center gap-2 text-sm"><input type="checkbox" name={key} checked={enabled.includes(key)} onChange={e=>setEnabled(current=>e.target.checked?[...current,key]:current.filter(m=>m!==key))}/><span>{label}</span><span className="ml-auto text-xs text-[var(--ink-soft)]">{formatMonthlyPrice(monthlyPrices[key])}/mês</span></label>)}</fieldset>
    <p className="text-xs text-[var(--ink-soft)]">O valor é calculado pelos módulos selecionados. Clique em Salvar configuração para confirmar o plano.</p></>}
    <button className={button}>{workspace?"Salvar configuração":"Cadastrar cliente"}</button></fieldset><Feedback state={state}/>
    {workspace&&<p className="text-xs text-[var(--ink-soft)]">Suspender bloqueia o acesso dos usuários desta empresa. Os dados são preservados.</p>}
  </form>;
}
export function PlatformInvite({workspace,master=false}:{workspace:string;master?:boolean}) {
  const [email,setEmail]=useState("");
  const [state,action,pending]=useActionState(platformAction.bind(null,master?"invite_master":"invite_admin",workspace),{});
  return <form action={action} className="space-y-3"><label className="block text-sm">{master?"E-mail do novo master Lume":"E-mail do administrador do cliente"}<input type="email" name="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} className={input}/></label><button disabled={pending} className={button}>Gerar convite</button><Feedback state={state}/></form>;
}
export function RemoveMaster({id}:{id:string}) {
  const [state,action,pending]=useActionState(platformAction.bind(null,"remove_master",id),{});
  return <form action={action} className="space-y-2"><label className="flex items-center gap-2 text-sm"><input name="confirm" type="checkbox" required/>Confirmo a remoção do acesso master e a desativação do acesso à Lume</label><button disabled={pending} className="text-sm text-red-700 underline">Remover master</button><Feedback state={state}/></form>;
}
export function RevokeInvite({id}:{id:string}) {
  const [state,action,pending]=useActionState(platformAction.bind(null,"revoke_invite",id),{});
  return <form action={action} className="space-y-2"><button disabled={pending} className="text-sm underline">Revogar convite</button><Feedback state={state}/></form>;
}
export function MemberForm({workspace,person,role,active,permissions,enabledModules}:{workspace:string;person:string;role:string;active:boolean;permissions:MemberPermission[];enabledModules:string[]}) {
  const [state,action,pending]=useActionState(saveMember.bind(null,workspace,person),{});
  const [memberRole,setRole]=useState(role);
  const [isActive,setActive]=useState(active);
  const [rights,setRights]=useState(()=>Object.fromEntries(products.map(([key])=>{const p=permissions.find(p=>p.module===key);return [key,{read:p?.can_read ?? true,create:p?.can_create ?? true,update:p?.can_update ?? true,delete:p?.can_delete ?? false,settle:p?.can_settle ?? false,reverse:p?.can_reverse ?? false}];})));
  return <form action={action} className="space-y-4"><fieldset disabled={pending} className="space-y-3">
    <label className="block text-sm">Perfil<select name="role" value={memberRole} onChange={e=>setRole(e.target.value)} className={input}><option value="admin">Administrador</option><option value="member">Usuário</option></select></label>
    <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" checked={isActive} onChange={e=>setActive(e.target.checked)}/>Acesso ativo</label>
    <p className="text-xs text-[var(--ink-soft)]">Administradores gerenciam a equipe e têm acesso completo aos módulos liberados. As permissões abaixo se aplicam ao perfil Usuário.</p>
    {products.map(([key,label])=><fieldset key={key} className="rounded-lg border border-border p-3"><legend className="px-1 text-sm">{label}{!enabledModules.includes(key)?" — não liberado pela Lume":""}</legend><div className="flex flex-wrap gap-4">{(["read","create","update","delete","settle","reverse"] as const).filter(right=>key==="financeiro"||!["settle","reverse"].includes(right)).map(right=><label key={right} className="flex items-center gap-1 text-xs"><input type="checkbox" name={key+"_"+right} checked={rights[key][right]} disabled={right!=="read"&&!rights[key].read} onChange={e=>setRights(current=>({...current,[key]:{...current[key],[right]:e.target.checked}}))}/>{{read:"Visualizar",create:"Criar",update:"Editar",delete:key==="financeiro"?"Cancelar":"Excluir",settle:"Registrar baixas",reverse:"Estornar baixas"}[right]}</label>)}</div>{key==="financeiro"&&<p className="mt-3 text-xs text-[var(--ink-soft)]">Categorias são gerenciadas por administradores. Cancelamentos e estornos exigem motivo e preservam o histórico.</p>}</fieldset>)}
    <button className={button}>Salvar acesso e permissões</button></fieldset><Feedback state={state}/>
  </form>;
}
