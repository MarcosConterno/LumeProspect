import "server-only";
import { requireModule } from "@/features/auth/module-access";
import { uuid, validateFilters } from "./validation";
import type { FinanceFilters, FinanceSnapshot, FinanceDetail, CompanyChoice, FinanceSearch } from "../types";
import type { Json } from "@/types/database";

export function financeError(error: {code?: string;message?: string}|null) {
  if(!error) return;
  if(["PGRST202","42P01","42883"].includes(error.code ?? "")) throw new Error("A estrutura financeira ainda não foi aplicada. Execute as migrations financeiras pendentes no Supabase, incluindo 20260925160000_finance_entry_dates.sql.");
  if(error.code==="42501") throw new Error("Você não tem permissão para esta operação financeira.");
  if(error.code==="40001") throw new Error("Este registro mudou em outra sessão. Recarregue os dados antes de salvar.");
  const message=error.message ?? "";
  if(message.includes("exceeds outstanding")) throw new Error("O valor informado ultrapassa o saldo em aberto.");
  if(message.includes("has payment history")) throw new Error("Com histórico de baixas, tipo, empresa, categoria e valor ficam preservados. Você pode editar descrição, vencimento e observações.");
  if(message.includes("Reverse payments")) throw new Error("Estorne as baixas existentes antes de cancelar o lançamento.");
  if(message.includes("already reversed")) throw new Error("Esta baixa já foi estornada.");
  if(message.includes("cancelled")) throw new Error("Este lançamento está cancelado.");
  if(message.includes("Company unavailable")) throw new Error("Selecione uma empresa ativa do cadastro.");
  if(message.includes("Category unavailable")) throw new Error("Selecione uma categoria ativa compatível com o tipo do lançamento.");
  if(message.includes("Invalid settlement")) throw new Error("Confira o valor e a data da baixa. Uma baixa realizada não pode ter data futura.");
  if(error.code==="23505") throw new Error("Este registro já existe. Atualize a tela antes de tentar novamente.");
  if(["23514","23503","23502","22003","22007","22008","22P02"].includes(error.code ?? "")) throw new Error("Os dados não atendem às regras do financeiro. Confira valores, datas e vínculos.");
  throw new Error("Não foi possível acessar o financeiro. Tente novamente.");
}
export async function financeContext(expected?: string) {
  const context=await requireModule("financeiro");
  if(expected&&context.active.workspace_id!==uuid(expected)) throw new Error("A empresa ativa mudou. Recarregue a página.");
  return context;
}
export function todayInSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
}
function requiredJson<T>(data: Json | null): T {
  if(data===null||typeof data!=="object") throw new Error("O financeiro retornou dados inválidos. Atualize a página.");
  return data as unknown as T;
}
export async function loadFinance(workspace: string, filters: FinanceFilters) {
  const {db}=await financeContext(workspace);
  const checked = validateFilters(filters);
  const [result,search,dashboard] = await Promise.all([
    db.rpc("finance_snapshot",{target:workspace,filters:{month:checked.month,type:"all",status:"all",query:"",page:1}}),
    db.rpc("finance_search_entries",{target:workspace,filters:{...checked}}),
    db.rpc("finance_dashboard",{target:workspace,selected_month:checked.month}),
  ]);
  financeError(result.error);
  financeSearchError(search.error);
  financeError(dashboard.error);
  const matches = requiredJson<FinanceSearch>(search.data);
  const metrics = requiredJson<{overdue:number;overdueCount:number;receivableOpenCount:number;payableOpenCount:number;monthly:{month:number;receivable:number;payable:number}[]}>(dashboard.data);
  const snapshot = requiredJson<Omit<FinanceSnapshot,"search">>(result.data);
  return {...snapshot,totals:{...snapshot.totals,overdue:metrics.overdue,overdueCount:metrics.overdueCount,receivableOpenCount:metrics.receivableOpenCount,payableOpenCount:metrics.payableOpenCount},monthly:metrics.monthly,entries:matches.entries,count:matches.count,page:matches.page,search:matches};
}

export async function loadFinanceSettings(workspace?: string) {
  const {db,active}=await financeContext(workspace);
  const result=await db.rpc("finance_snapshot",{target:active.workspace_id,filters:{month:todayInSaoPaulo().slice(0,7),type:"all",status:"all",query:"",page:1}});
  financeError(result.error);
  const snapshot=requiredJson<FinanceSnapshot>(result.data);
  return {active,categories:snapshot.categories,canManage:snapshot.permissions.categories};
}

function financeSearchError(error: {code?:string;message?:string}|null) {
  if(error && ["PGRST202","42883"].includes(error.code ?? "")) throw new Error("A busca financeira precisa da atualização 20260915120000_finance_search_reports.sql no Supabase.");
  if(error?.message?.includes("Report limit exceeded")) throw new Error("O relatório ultrapassa 5.000 lançamentos. Reduza o período ou refine os filtros para imprimir todos os resultados.");
  financeError(error);
}

export async function loadFinanceReport(workspace: string, filters: FinanceFilters) {
  const {db,active}=await financeContext(workspace);
  const checked=validateFilters(filters);
  const result=await db.rpc("finance_search_entries",{target:workspace,filters:{...checked},export_all:true});
  financeSearchError(result.error);
  return {companyName:active.workspaces.name,filters:checked,search:requiredJson<FinanceSearch>(result.data),issuedAt:new Date().toISOString()};
}
export async function loadFinanceDetail(workspace: string,id: string) {
  const {db}=await financeContext(workspace);
  const result=await db.rpc("finance_entry_detail",{target:workspace,entry:uuid(id)});
  financeError(result.error);
  return requiredJson<FinanceDetail>(result.data);
}
export async function searchFinanceCompanies(workspace: string,query: string) {
  const {db}=await financeContext(workspace);
  const result=await db.rpc("finance_search_companies",{target:workspace,query:query.trim().slice(0,100)});
  financeError(result.error);
  return requiredJson<CompanyChoice[]>(result.data);
}
