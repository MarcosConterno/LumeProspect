"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/ui/brand";
import { NavIcon } from "./nav-icon";
import { filteredNavigation, platformNavigation } from "./navigation";

export function Sidebar({collapsed,onToggle,allowedModules,area="workspace"}:{collapsed:boolean;onToggle:()=>void;allowedModules:string[];area?:"workspace"|"platform"}) {
  const pathname=usePathname();
  const items=area==="platform" ? platformNavigation : filteredNavigation(allowedModules);
  return <aside className={`app-sidebar ${collapsed?"is-collapsed":""}`}>
    <div className="sidebar-heading"><Brand compact={collapsed} href={area==="platform"?"/lume":"/dashboard"}/><button type="button" onClick={onToggle} className="sidebar-toggle" aria-label={collapsed?"Expandir menu":"Recolher menu"} aria-expanded={!collapsed}>{collapsed?"›":"‹"}</button></div>
    <nav aria-label={area==="platform"?"Administração Lume":"Navegação principal"} className="sidebar-navigation">
      {items.map(([label,href,icon])=><Link key={href} href={href} title={collapsed?label:undefined} aria-label={collapsed?label:undefined} aria-current={(href==="/lume" ? pathname==="/lume"||pathname.startsWith("/lume/clientes/") : pathname===href||pathname.startsWith(href+"/"))?"page":undefined}><NavIcon name={icon}/>{!collapsed&&<span>{label}</span>}</Link>)}
    </nav>
    <div className="sidebar-footer">{collapsed?"Lume":area==="platform"?"Administração da plataforma":"Seu ambiente de trabalho"}</div>
  </aside>;
}
