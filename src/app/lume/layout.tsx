import Link from "next/link";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { requireMaster } from "@/features/platform/repository";
import { AccountMenu } from "@/components/layout/account-menu";
export default async function LumeLayout({children}:{children:ReactNode}) {
  await requireMaster();
  return <AppShell area="platform"><div className="workspace-bar">
    <div className="min-w-0"><p className="eyebrow">Administração Lume</p><p className="break-all text-xs text-[var(--ink-soft)]">Acesso master</p></div>
    <div className="workspace-actions"><Link href="/dashboard">Ambiente atual</Link><AccountMenu /></div>
  </div><div className="platform-content">{children}</div></AppShell>;
}
