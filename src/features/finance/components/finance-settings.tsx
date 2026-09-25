"use client";
import { useRouter } from "next/navigation";
import { CategoryManager } from "./category-manager";
import type { FinanceCategory } from "../types";
export function FinanceSettings({workspace,categories}:{workspace:string;categories:FinanceCategory[]}) {
  const router=useRouter();
  return <CategoryManager workspace={workspace} categories={categories} onSaved={()=>router.refresh()}/>;
}
