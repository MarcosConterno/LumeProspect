import Link from "next/link";
import { loadMemberSettings, loadPlatform, loadMasters } from "@/features/platform/repository";
import { PlatformUserForm } from "@/features/platform/components/user-form";
import { MemberForm, RemoveMaster } from "@/features/platform/components/forms";
import { roleLabels } from "@/features/platform/roles";
import { authAdminConfigured } from "@/lib/supabase/admin";

export default async function UsersPage({searchParams}:{searchParams:Promise<{empresa?:string;q?:string;empresasPagina?:string;page?:string}>}) {
  const params=await searchParams;
  const page=Math.max(1,Math.min(10000,Math.trunc(Number(params.page))||1));
  const data=await loadMemberSettings(params.empresa,page);
  const {active,user,isMaster,members,permissions,modules,masterIds}=data;
  const manager=active.role==="manager" && !isMaster;
  const q=(params.q ?? "").trim().slice(0,100);
  const companyPage=Math.max(1,Math.min(10000,Math.trunc(Number(params.empresasPagina))||1));
  const [companies,masters]=await Promise.all([isMaster ? loadPlatform(q,companyPage) : null,isMaster ? loadMasters() : null]);
  const choices=companies?.rows ?? [];
  const options=choices.some(c=>c.id===active.workspace_id) ? choices : [active.workspaces,...choices];
  const href=(p:number)=>"/configuracoes/usuarios?"+new URLSearchParams({empresa:active.workspace_id,page:String(p)});
  const companyHref=(p:number)=>"/configuracoes/usuarios?"+new URLSearchParams({empresa:active.workspace_id,q,empresasPagina:String(p)});
  return <div className="space-y-6">
    <header><h2 className="font-display text-2xl">Usuários</h2><p className="mt-2 text-sm">{isMaster ? "Escolha a empresa para cadastrar e gerenciar seus usuários." : "Cadastre e gerencie os usuários da sua empresa."}</p></header>
    {isMaster && companies && <section className="space-y-4 rounded-xl border border-border bg-surface p-5" aria-label="Selecionar empresa dos usuários">
      <form className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="empresa" value={active.workspace_id}/>
        <label className="grow text-sm">Buscar empresa<input name="q" defaultValue={q} maxLength={100} className="crm-input"/></label><button className="rounded-lg border border-border px-4 py-2 text-sm">Buscar</button>
      </form>
      <form className="flex flex-wrap items-end gap-3">
        <label className="grow text-sm">Empresa dos usuários<select key={active.workspace_id+":"+q+":"+companyPage} name="empresa" defaultValue={active.workspace_id} className="crm-input">{options.map(c=><option key={c.id} value={c.id}>{c.name}{c.status!=="active" ? " (suspensa)" : ""}</option>)}</select></label>
        <button className="rounded-lg bg-accent px-4 py-2 text-sm text-white">Selecionar empresa</button>
      </form>
      <nav className="flex flex-wrap gap-3 text-xs" aria-label="Páginas de empresas"><span>{companies.count} empresa(s) encontrada(s) · página {companyPage}</span>{companyPage>1 && <Link href={companyHref(companyPage-1)} className="underline">Anteriores</Link>}{companyPage*25<companies.count && <Link href={companyHref(companyPage+1)} className="underline">Próximas</Link>}</nav>
      <p className="text-xs text-[var(--ink-soft)]">Esta seleção vale para a gestão de usuários. Para trabalhar nos dados de uma empresa, use Entrar no ambiente em Ambientes.</p>
    </section>}
    <div className="rounded-xl border border-border bg-[var(--accent-soft)] p-4"><p className="text-xs">Empresa dos usuários</p><strong>{active.workspaces.name}</strong></div>
    {active.workspaces.status==="active" ? <section className="space-y-4 rounded-xl border border-border bg-surface p-5"><h3 className="font-display text-xl">Cadastrar usuário</h3><PlatformUserForm workspace={active.workspace_id} canCreate={authAdminConfigured()} operatorRole={active.role}/></section> : <p role="status">Empresa suspensa: reative-a antes de cadastrar novos usuários.</p>}
    {manager && <p className="text-sm">Você pode gerenciar usuários comuns e conceder somente permissões que também possui.</p>}
    <h3 className="font-display text-xl">Usuários cadastrados ({data.count})</h3>
    {!members.length && <p className="text-sm">Nenhum usuário nesta página.</p>}
    {members.map(member=><section key={member.user_id} className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <div><h3 className="font-medium">{member.profiles?.full_name || "Usuário"}{member.user_id===user.id ? " (você)" : ""}</h3><p className="text-sm text-[var(--ink-soft)]">{masterIds.includes(member.user_id) ? "Master Lume" : roleLabels[member.role]} · {member.active ? "Ativo" : "Inativo"}</p></div>
      {member.user_id!==user.id && member.role!=="owner" && !masterIds.includes(member.user_id) && (!manager || member.role==="member") && <details><summary className="cursor-pointer text-sm text-accent-dark">Editar papel e permissões</summary><div className="pt-4"><MemberForm key={active.workspace_id+":"+member.user_id+":"+member.role+":"+member.active+":"+JSON.stringify(permissions.filter(p=>p.user_id===member.user_id))} workspace={active.workspace_id} person={member.user_id} role={member.role} active={member.active} permissions={permissions.filter(p=>p.user_id===member.user_id)} enabledModules={modules.filter(m=>m.enabled).map(m=>m.module)} operatorRole={active.role}/></div></details>}
    </section>)}
    <nav className="flex gap-4 text-sm" aria-label="Páginas de usuários">{page>1 && <Link className="underline" href={href(page-1)}>Anterior</Link>}<span>Página {page} de {Math.max(1,Math.ceil(data.count/25))}</span>{page*25<data.count && <Link className="underline" href={href(page+1)}>Próxima</Link>}</nav>
    {masters?.home && <details id="masters" className="space-y-4 rounded-xl border border-border bg-surface p-5"><summary className="cursor-pointer font-display text-xl">Masters da Lume</summary>
      <p className="text-sm">Masters acessam todas as empresas. Somente outro master pode conceder esse papel.</p>
      <PlatformUserForm workspace={masters.home} scope="master" canCreate={authAdminConfigured()}/>
      {masters.masters.map(master=><section key={master.user_id} className="space-y-2 border-t border-border pt-4"><h3 className="font-medium">{master.full_name || master.email}{master.user_id===user.id ? " (você)" : ""}</h3><p className="text-sm">{master.email}</p>{masters.masters.length>1 && master.user_id!==user.id && <RemoveMaster id={master.user_id}/>}</section>)}
    </details>}
  </div>;
}
