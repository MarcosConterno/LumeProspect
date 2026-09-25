import { requireModule } from "@/features/auth/module-access";
import { loadFinanceSettings } from "@/features/finance/data/repository";
import { FinanceSettings } from "@/features/finance/components/finance-settings";
import "@/features/finance/finance.css";
export default async function Page() {
  const {active}=await requireModule("financeiro");
  const {categories,canManage}=await loadFinanceSettings(active.workspace_id);
  return <div className="space-y-5"><header><h2 className="font-display text-2xl">Configurações do Financeiro</h2><p className="mt-2 text-sm">Categorias de receitas e despesas de {active.workspaces.name}.</p></header>
    {canManage ? <FinanceSettings workspace={active.workspace_id} categories={categories}/> : <section className="space-y-3 rounded-xl border border-border bg-surface p-5"><p className="text-sm">As categorias são gerenciadas pelos administradores da empresa.</p><ul className="space-y-2 text-sm">{categories.map(category=><li key={category.id}>{category.name} · {category.kind==="receivable" ? "Receita" : "Despesa"} · {category.active ? "Ativa" : "Inativa"}</li>)}</ul></section>}
  </div>;
}
