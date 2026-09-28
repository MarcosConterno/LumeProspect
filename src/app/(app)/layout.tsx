import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ModuleNotice } from "@/components/layout/module-notice";
import { getAccountIdentity, requireWorkspace } from "@/features/auth/context";
import { availableModules } from "@/features/auth/module-access";
import { returnToLume } from "@/features/auth/actions";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
export default async function AppLayout({children}:{children:ReactNode}) {
  const [{active,isMaster},allowedModules,identity]=await Promise.all([requireWorkspace(),availableModules(),getAccountIdentity()]);
  return <AppShell allowedModules={allowedModules} area={isMaster ? "platform" : "workspace"}>
    <WorkspaceHeader name={identity.name} email={identity.email} context={`${isMaster ? "Master Lume · " : ""}Ambiente: ${active.workspaces.name}`} actions={isMaster&&!active.workspaces.is_lume ? <form action={returnToLume}><button type="submit" className="font-medium text-accent-dark">Voltar para Lume</button></form> : undefined} />
    <ModuleNotice/>{children}
  </AppShell>;
}
