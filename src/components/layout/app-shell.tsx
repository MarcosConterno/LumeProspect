"use client";
import type { ReactNode } from "react";
import { useState } from "react";
import { MobileHeader } from "./mobile-header";
import { Sidebar } from "./sidebar";

export function AppShell({children,allowedModules=[],area="workspace"}:{children:ReactNode;allowedModules?:string[];area?:"workspace"|"platform"}) {
  const [collapsed,setCollapsed]=useState(false);
  return <div className={`app-shell ${collapsed?"sidebar-collapsed":""}`}>
    <a href="#main-content" className="skip-link">Pular para o conteúdo</a>
    <Sidebar area={area} allowedModules={allowedModules} collapsed={collapsed} onToggle={()=>setCollapsed(current=>!current)}/>
    <div className="app-main"><MobileHeader area={area} allowedModules={allowedModules}/><main id="main-content" className="app-content" tabIndex={-1}>{children}</main></div>
  </div>;
}
