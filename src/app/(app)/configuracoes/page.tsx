import Link from "next/link";
import { requireWorkspace } from "@/features/auth/context";
import { availableModules } from "@/features/auth/module-access";
import { managesUsers } from "@/features/platform/roles";
export default async function SettingsPage({searchParams}:{searchParams:Promise<{denied?:string}>}) {
  const [{active,isMaster},modules,params]=await Promise.all([requireWorkspace(),availableModules(),searchParams]);
  const cards=[
    {title:"Empresa",href:"/configuracoes/empresa",description:"Dados cadastrais e módulos da empresa."},
    ...(isMaster || managesUsers(active.role) ? [{title:"Usuários",href:"/configuracoes/usuarios",description:isMaster ? "Cadastre usuários em qualquer empresa e gerencie masters, papéis e permissões." : "Cadastre pessoas e gerencie os acessos da sua empresa."}] : []),
    ...(modules.includes("financeiro") ? [{title:"Financeiro",href:"/configuracoes/financeiro",description:"Categorias de receitas e despesas."}] : []),
    ...(modules.includes("crm") ? [{title:"CRM",href:"/configuracoes/crm",description:"Regras do funil e cadastros comerciais."},{title:"Serviços",href:"/configuracoes/servicos",description:"Cadastre, edite e inative serviços do catálogo."}] : []),
  ];
  return <div className="space-y-5">
    {params.denied==="users" && <p role="alert" className="rounded-lg border border-border p-4 text-sm">A gestão de usuários é exclusiva de masters, administradores e gerentes.</p>}
    <div className="grid gap-4 sm:grid-cols-2">{cards.map(card=><Link key={card.href} href={card.href} className="space-y-2 rounded-xl border border-border bg-surface p-5 hover:border-accent"><h2 className="font-display text-xl">{card.title}</h2><p className="text-sm text-[var(--ink-soft)]">{card.description}</p><span className="inline-block pt-2 text-sm text-accent-dark">Abrir configurações →</span></Link>)}</div>
  </div>;
}
