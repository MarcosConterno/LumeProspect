import type { ReactNode } from "react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-60">
        <MobileHeader />
        <main className="mx-auto max-w-5xl px-6 py-10 sm:px-10 lg:px-14 lg:py-14">{children}</main>
      </div>
    </div>
  );
}
