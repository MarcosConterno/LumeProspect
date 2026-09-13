import Link from "next/link";
import { navigation } from "@/components/layout/navigation";

export function MobileHeader() {
  return (
    <header className="border-b border-[var(--border-soft)] px-5 py-4 lg:hidden">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between font-display text-base [&::-webkit-details-marker]:hidden">
          <Link href="/dashboard">Lume Prospect</Link>
          <span aria-hidden="true" className="font-sans text-lg text-[var(--ink-soft)] group-open:rotate-45 transition-transform">+</span>
        </summary>
        <nav aria-label="Navegação mobile" className="mt-4 grid grid-cols-2 gap-1 border-t border-[var(--border-soft)] pt-3">
          {navigation.map(([label, href]) => (
            <Link key={href} href={href} className="rounded-md px-3 py-2 text-sm text-[var(--ink-soft)] hover:bg-[var(--accent-soft)] hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent">
              {label}
            </Link>
          ))}
        </nav>
      </details>
    </header>
  );
}
