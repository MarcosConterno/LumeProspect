"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/ui/brand";
import { NavIcon } from "./nav-icon";
import { filteredNavigation, platformNavigation } from "./navigation";

export function MobileHeader({allowedModules,area="workspace"}:{allowedModules:string[];area?:"workspace"|"platform"}) {
  const pathname=usePathname();
  const items=area==="platform"?platformNavigation:filteredNavigation(allowedModules);
  return <header className="mobile-header">
    <Brand href={area==="platform"?"/lume":"/dashboard"}/>
    <details key={pathname} className="mobile-menu">
      <summary aria-label="Abrir ou fechar menu"><span aria-hidden="true">☰</span><span>Menu</span></summary>
      <nav aria-label="Navegação mobile">
        {items.map(([label,href,icon])=><Link key={href} href={href} aria-current={pathname===href||pathname.startsWith(href+"/")&&href!=="/lume"?"page":undefined} onClick={event=>event.currentTarget.closest("details")?.removeAttribute("open")}><NavIcon name={icon}/><span>{label}</span></Link>)}
      </nav>
    </details>
  </header>;
}
