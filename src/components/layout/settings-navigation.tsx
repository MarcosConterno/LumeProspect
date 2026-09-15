"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function SettingsNavigation() {
  const pathname = usePathname();
  return <nav aria-label="Seções de configurações" className="settings-tabs">
    {[["Minha empresa","/configuracoes/empresa"],["Equipe","/configuracoes/equipe"]].map(([label,href]) =>
      <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</Link>
    )}
  </nav>;
}

