import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { requireMaster } from "@/features/platform/repository";
import { getAccountIdentity } from "@/features/auth/context";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
export default async function LumeLayout({children}:{children:ReactNode}) {
  const [{active}, identity]=await Promise.all([requireMaster(),getAccountIdentity()]);
  return <AppShell area="platform"><WorkspaceHeader name={identity.name} email={identity.email} context={`Master Lume · Ambiente: ${active?.workspaces.name ?? "selecione uma empresa"}`} /><div className="platform-content">{children}</div></AppShell>;
}
