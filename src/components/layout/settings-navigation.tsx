"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function SettingsNavigation({canManageUsers,modules}:{canManageUsers:boolean;modules:string[]}) {
  const pathname=usePathname();
  const sections=[
    ["Resumo","/configuracoes"], ["Empresa","/configuracoes/empresa"],
    ...(canManageUsers ? [["Usuários","/configuracoes/usuarios"]] : []),
    ...(modules.includes("financeiro") ? [["Financeiro","/configuracoes/financeiro"]] : []),
    ...(modules.includes("crm") ? [["CRM","/configuracoes/crm"],["Serviços","/configuracoes/servicos"]] : []),
  ];
  return <nav aria-label="Seções de configurações" className="settings-tabs">
    {sections.map(([label,href])=><Link key={href} href={href} aria-current={pathname===href ? "page" : undefined}>{label}</Link>)}
  </nav>;
}
