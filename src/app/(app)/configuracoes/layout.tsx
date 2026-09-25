import type { ReactNode } from "react";
import Link from "next/link";
import { SettingsNavigation } from "@/components/layout/settings-navigation";
import { requireWorkspace } from "@/features/auth/context";
import { availableModules } from "@/features/auth/module-access";
import { managesUsers } from "@/features/platform/roles";
export default async function SettingsLayout({children}:{children:ReactNode}) {
  const [{active,isMaster},modules]=await Promise.all([requireWorkspace(),availableModules()]);
  return <div className="settings-content">
    <header className="page-heading"><p className="eyebrow">Administração</p><h1>Configurações</h1><p>Empresa, usuários e módulos em um só lugar.</p></header>
    <p className="text-sm text-[var(--ink-soft)]">Ambiente dos módulos: <strong>{active.workspaces.name}</strong>{isMaster && <> · <Link href="/lume" className="underline">Trocar ambiente</Link></>}</p>
    <SettingsNavigation canManageUsers={isMaster || managesUsers(active.role)} modules={modules}/>
    {children}
  </div>;
}
