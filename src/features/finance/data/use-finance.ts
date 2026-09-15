"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { refreshFinance } from "../actions";
import type { FinanceFilters, FinanceSnapshot } from "../types";

export function useFinance(initial: FinanceSnapshot) {
  const [filters, setFilters] = useState<FinanceFilters>({month:initial.month,type:"all",status:"all",query:"",page:1});
  const [snapshot, setSnapshot] = useState(initial);
  const [error, setError] = useState("");
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(n => n + 1), []);

  useEffect(() => {
    let disposed = false;
    const fetchSnapshot = async () => {
      setLoading(true);
      try {
        const result = await refreshFinance(initial.workspace, filters);
        if(disposed) return;
        if(result.error !== undefined) setError(result.error);
        else {setSnapshot(result.data); setError("");}
      } catch {if(!disposed) setError("Não foi possível atualizar o financeiro. Tente novamente.");}
      finally {if(!disposed) setLoading(false);}
    };
    const timer = setTimeout(fetchSnapshot, 250);
    return () => {disposed=true; clearTimeout(timer);};
  }, [initial.workspace, filters, revision]);

  // The subscription belongs to the workspace, independently of list filters.
  useEffect(() => {
    let disposed = false;
    const onVisible = () => {if(document.visibilityState === "visible") refresh();};
    const db = createClient();
    const channel = db.channel("finance:" + initial.workspace)
      .on("postgres_changes", {event:"*",schema:"public",table:"finance_entries",filter:"workspace_id=eq." + initial.workspace}, refresh)
      .on("postgres_changes", {event:"*",schema:"public",table:"finance_categories",filter:"workspace_id=eq." + initial.workspace}, refresh)
      .subscribe(status => {if(!disposed) {setLive(status === "SUBSCRIBED"); if(status === "SUBSCRIBED") refresh();}});
    const interval = setInterval(onVisible, 60000);
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {disposed=true; clearInterval(interval); window.removeEventListener("focus",onVisible); document.removeEventListener("visibilitychange",onVisible); void db.removeChannel(channel);};
  }, [initial.workspace, refresh]);

  return {snapshot,filters,setFilters,error,live,loading,refresh};
}
