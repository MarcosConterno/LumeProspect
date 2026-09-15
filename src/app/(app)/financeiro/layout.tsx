import type { ReactNode } from "react";
import { requireModule } from "@/features/auth/module-access";
export default async function ModuleLayout({children}:{children:ReactNode}) {
  await requireModule("financeiro");
  return children;
}

