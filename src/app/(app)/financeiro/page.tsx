import { FinanceWorkspace } from "@/features/finance/components/finance-workspace";
import "@/features/finance/finance.css";
import { financeContext, loadFinance, todayInSaoPaulo } from "@/features/finance/data/repository";
import { unstable_rethrow } from "next/navigation";
import type { FinanceSnapshot } from "@/features/finance/types";

export default async function FinanceiroPage() {
  let initial: FinanceSnapshot | null = null;
  let message = "Não foi possível carregar o financeiro.";

  try {
    const {active}=await financeContext();
    initial=await loadFinance(active.workspace_id,{month:todayInSaoPaulo().slice(0,7),type:"all",status:"all",query:"",page:1});
  } catch(error) {
    unstable_rethrow(error);
    if (error instanceof Error) message = error.message;
  }

  if (!initial) {
    return <section className="finance-workspace"><h1>Financeiro</h1><p role="alert" className="finance-empty">{message}</p></section>;
  }

  return <FinanceWorkspace key={initial.workspace} initial={initial}/>;
}
