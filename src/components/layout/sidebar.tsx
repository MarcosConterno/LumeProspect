"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigation } from "@/components/layout/navigation";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-[var(--border-soft)] bg-background px-5 py-7 lg:flex">
      <Link href="/dashboard" className="mb-10 flex items-center gap-2 px-1">
        <span className="flex size-8 items-center justify-center rounded-lg border-[1.5px] border-foreground text-sm font-semibold">L</span>
        <span className="font-display text-base">Lume Prospect</span>
      </Link>
      <nav aria-label="Navegação principal" className="flex flex-1 flex-col gap-1">
        {navigation.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            className={`relative rounded-md px-3 py-2 text-[13.5px] font-medium transition-colors hover:bg-[var(--accent-soft)] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${pathname === href ? "bg-[var(--accent-soft)] font-semibold text-foreground before:absolute before:-left-5 before:top-1/2 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-accent" : "text-[var(--ink-soft)]"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-[var(--border-soft)] pt-4 text-xs text-[var(--ink-faint)]">
        Fundação inicial
      </div>
    </aside>
  );
}
