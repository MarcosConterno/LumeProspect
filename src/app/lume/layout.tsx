import Link from "next/link";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { requireMaster } from "@/features/platform/repository";
import { AccountMenu } from "@/components/layout/account-menu";
import { getWorkspaceContext } from "@/features/auth/context";
export default async function LumeLayout({children}:{children:ReactNode}) {
  await requireMaster();
  const {active}=await getWorkspaceContext();
  return <AppShell area="platform"><div className="workspace-bar">
    <div className="min-w-0"><p className="eyebrow">Master Lume · acesso completo</p><p className="break-all text-xs text-[var(--ink-soft)]">Módulos da empresa: {active?.workspaces.name ?? "selecione uma empresa"}</p></div>
    <div className="workspace-actions"><Link href="/lume">Trocar empresa</Link><Link href="/dashboard">Abrir módulos</Link><AccountMenu /></div>
  </div><div className="platform-content">{children}</div></AppShell>;
}
