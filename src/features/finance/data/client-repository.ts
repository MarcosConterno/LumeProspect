"use client";

import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database";
import type { FinanceDetail, FinanceKind, FinanceMovements, FinanceReversedMovements, FinanceResult } from "../types";

type FinanceRpcError = { code?: string; message?: string };
const db=createClient();

function clientFinanceError(error: FinanceRpcError | null) {
  if (!error) return "Não foi possível acessar o financeiro. Tente novamente.";
  if (error.code === "42501") return "Você não tem permissão para esta operação financeira.";
  if (error.code === "PGRST202" || error.code === "42883") return "A estrutura financeira ainda não foi aplicada no Supabase.";
  if (error.code === "23514") return "Os filtros informados não são válidos.";
  return "Não foi possível carregar o financeiro. Tente novamente.";
}

function requiredJson<T>(data: Json | null): T | null {
  return data && typeof data === "object" ? data as unknown as T : null;
}

export async function loadFinanceMovementsClient(workspace: string,filters:{month:string;kind:FinanceKind;query:string;page:number},signal?:AbortSignal):Promise<FinanceResult<FinanceMovements>> {
  const request=db.rpc("finance_cash_movements",{target:workspace,filters});
  if(signal) request.abortSignal(signal);
  const result=await request;
  if(result.error) return {error:clientFinanceError(result.error)};
  const data=requiredJson<FinanceMovements>(result.data);
  return data ? {data} : {error:"O financeiro retornou dados inválidos. Atualize a página."};
}

export async function loadFinanceReversedMovementsClient(workspace: string,filters:{month:string;query:string;page:number},signal?:AbortSignal):Promise<FinanceResult<FinanceReversedMovements>> {
  const request=db.rpc("finance_reversed_movements",{target:workspace,filters});
  if(signal) request.abortSignal(signal);
  const result=await request;
  if(result.error) return {error:clientFinanceError(result.error)};
  const data=requiredJson<FinanceReversedMovements>(result.data);
  return data ? {data} : {error:"O financeiro retornou dados inválidos. Atualize a página."};
}

export async function loadFinanceDetailClient(workspace:string,id:string,signal?:AbortSignal):Promise<FinanceResult<FinanceDetail>> {
  const request=db.rpc("finance_entry_detail",{target:workspace,entry:id});
  if(signal) request.abortSignal(signal);
  const result=await request;
  if(result.error) return {error:clientFinanceError(result.error)};
  const data=requiredJson<FinanceDetail>(result.data);
  return data ? {data} : {error:"O lançamento retornou dados inválidos. Atualize a página."};
}
