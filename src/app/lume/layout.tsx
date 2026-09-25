import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { requireMaster } from "@/features/platform/repository";
import { AccountMenu } from "@/components/layout/account-menu";
import { getAccountIdentity } from "@/features/auth/context";
export default async function LumeLayout({children}:{children:ReactNode}) {
  const [{active}, identity]=await Promise.all([requireMaster(),getAccountIdentity()]);
  return <AppShell area="platform"><div className="workspace-bar">
    <div className="min-w-0"><p className="eyebrow">Master Lume · acesso completo</p><p className="break-all text-xs text-[var(--ink-soft)]">Ambiente dos módulos: {active?.workspaces.name ?? "selecione uma empresa"}</p></div>
    <div className="workspace-actions"><AccountMenu identity={identity} /></div>
  </div><div className="platform-content">{children}</div></AppShell>;
}
