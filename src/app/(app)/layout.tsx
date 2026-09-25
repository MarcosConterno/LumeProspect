import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ModuleNotice } from "@/components/layout/module-notice";
import { getAccountIdentity, requireWorkspace } from "@/features/auth/context";
import { availableModules } from "@/features/auth/module-access";
import { AccountMenu } from "@/components/layout/account-menu";
import { returnToLume } from "@/features/auth/actions";
export default async function AppLayout({children}:{children:ReactNode}) {
  const [{active,isMaster},allowedModules,identity]=await Promise.all([requireWorkspace(),availableModules(),getAccountIdentity()]);
  return <AppShell allowedModules={allowedModules} area={isMaster ? "platform" : "workspace"}>
    <div className="workspace-bar">
      <span className="font-medium">{isMaster ? "Master Lume · " : ""}Ambiente: {active.workspaces.name}</span>
      <div className="workspace-actions">{isMaster&&!active.workspaces.is_lume&&<form action={returnToLume}><button type="submit" className="font-medium text-accent-dark">Voltar para Lume</button></form>}<AccountMenu identity={identity} /></div>
    </div>
    <ModuleNotice/>{children}
  </AppShell>;
}
