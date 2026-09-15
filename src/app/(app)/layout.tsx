import type { ReactNode } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { ModuleNotice } from "@/components/layout/module-notice";
import { requireWorkspace } from "@/features/auth/context";
import { availableModules } from "@/features/auth/module-access";
import { AccountMenu } from "@/components/layout/account-menu";
export default async function AppLayout({children}:{children:ReactNode}) {
  const [{active,isMaster},allowedModules]=await Promise.all([requireWorkspace(),availableModules()]);
  return <AppShell allowedModules={allowedModules}>
    <div className="workspace-bar">
      <span className="font-medium">Ambiente: {active.workspaces.name}</span>
      <div className="workspace-actions">{isMaster&&<Link href="/lume" className="font-medium text-accent-dark">Administração Lume</Link>}<AccountMenu /></div>
    </div>
    {isMaster&&<p className="mb-5 rounded-lg border border-accent bg-[var(--accent-soft)] p-3 text-sm">Você está operando como master Lume no ambiente <strong>{active.workspaces.name}</strong>. <Link href="/lume" className="underline">Trocar ambiente</Link></p>}
    <ModuleNotice/>{children}
  </AppShell>;
}
