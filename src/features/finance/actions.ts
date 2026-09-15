"use server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { financeContext, financeError, loadFinance, loadFinanceDetail, searchFinanceCompanies } from "./data/repository";
import { cents, date, text, uuid, validateEntry, version } from "./data/validation";
import type { EntryInput, FinanceCategory, FinanceFilters, FinanceResult } from "./types";

async function perform<T>(work:()=>Promise<T>):Promise<FinanceResult<T>> {
  try {return {data:await work()};}
  catch(error) {unstable_rethrow(error);return {error:error instanceof Error?error.message:"Não foi possível concluir a operação."};}
}
export async function refreshFinance(workspace:string,filters:FinanceFilters) {return perform(()=>loadFinance(workspace,filters));}
export async function readFinanceEntry(workspace:string,id:string) {return perform(()=>loadFinanceDetail(workspace,id));}
export async function findFinanceCompanies(workspace:string,query:string) {return perform(()=>searchFinanceCompanies(workspace,query));}
export async function saveFinanceEntry(workspace:string,input:EntryInput) {
  return perform(async()=>{
    const {db}=await financeContext(workspace);
    const payload=validateEntry(input);
    const result=await db.rpc("finance_save_entry",{target:workspace,payload:{...payload}});
    financeError(result.error);revalidatePath("/financeiro");return result.data;
  });
}
export async function saveFinanceCategory(workspace:string,input:{id:string;version?:number;name:string;kind:FinanceCategory["kind"];active:boolean}) {
  return perform(async()=>{
    const {db}=await financeContext(workspace);
    if(!["receivable","payable"].includes(input.kind)||typeof input.active!=="boolean") throw new Error("Categoria inválida.");
    const result=await db.rpc("finance_save_category",{target:workspace,payload:{...input,id:uuid(input.id),version:input.version===undefined?undefined:version(input.version),name:text(input.name,2,80)}});
    financeError(result.error);revalidatePath("/financeiro");return result.data;
  });
}
export async function settleFinanceEntry(workspace:string,input:{id:string;entryId:string;version:number;amountCents:number;paidOn:string;notes:string}) {
  return perform(async()=>{
    const {db}=await financeContext(workspace);
    const result=await db.rpc("finance_settle",{target:workspace,payload:{id:uuid(input.id),entryId:uuid(input.entryId),version:version(input.version),amountCents:cents(input.amountCents),paidOn:date(input.paidOn),notes:text(input.notes,0,1000)}});
    financeError(result.error);revalidatePath("/financeiro");return result.data;
  });
}
export async function reverseFinancePayment(workspace:string,input:{id:string;entryId:string;version:number;reason:string}) {
  return perform(async()=>{
    const {db}=await financeContext(workspace);
    const result=await db.rpc("finance_reverse_payment",{target:workspace,payload:{id:uuid(input.id),entryId:uuid(input.entryId),version:version(input.version),reason:text(input.reason,3,500)}});
    financeError(result.error);revalidatePath("/financeiro");return {saved:true};
  });
}
export async function cancelFinanceEntry(workspace:string,input:{id:string;version:number;reason:string}) {
  return perform(async()=>{
    const {db}=await financeContext(workspace);
    const result=await db.rpc("finance_cancel_entry",{target:workspace,payload:{id:uuid(input.id),version:version(input.version),reason:text(input.reason,3,500)}});
    financeError(result.error);revalidatePath("/financeiro");return {saved:true};
  });
}

