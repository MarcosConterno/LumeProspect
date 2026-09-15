import type { ReactNode } from "react";
import { SettingsNavigation } from "@/components/layout/settings-navigation";
export default function SettingsLayout({children}:{children:ReactNode}) {
  return <div className="settings-content">
    <header className="page-heading"><p className="eyebrow">Administração</p><h1>Configurações</h1><p>Organize os dados da empresa e os acessos da sua equipe.</p></header>
    <SettingsNavigation />
    {children}
  </div>;
}

