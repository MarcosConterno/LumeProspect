"use client";
import { usePathname } from "next/navigation";
export function ModuleNotice() {
  const pathname = usePathname();
  if (!/^\/crm(\/|$)/.test(pathname)) return null;
  return <p className="mb-6 rounded-lg bg-[var(--accent-soft)] p-3 text-sm">Esta tela ainda usa dados de demonstração. Os cadastros reais estão em Clientes, seus contatos e Serviços.</p>;
}

