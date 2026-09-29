"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { refreshFinance } from "../actions";
import type { FinanceFilters, FinanceSnapshot } from "../types";

export function useFinance(initial: FinanceSnapshot) {
  const initialFilters: FinanceFilters = {month:initial.month,type:"all",status:"all",query:"",page:1};
  const [filters, setFilters] = useState<FinanceFilters>(initialFilters);
  const [settledFilters, setSettledFilters] = useState<FinanceFilters>(initialFilters);
  const [snapshot, setSnapshot] = useState(initial);
  const [error, setError] = useState("");
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const lastAutomaticRefresh = useRef(0);
  const refresh = useCallback(() => {setLoading(true);setRevision(n => n + 1);}, []);
  const refreshAutomatically = useCallback(() => {
    const now = Date.now();
    if (now - lastAutomaticRefresh.current < 5000) return;
    lastAutomaticRefresh.current = now;
    setLoading(true);setRevision(n => n + 1);
  }, []);
  const mounted = useRef(false);

  useEffect(() => {
    let disposed = false;
    if (!mounted.current) {
      mounted.current = true;
      return () => { disposed = true; };
    }
    const fetchSnapshot = async () => {
      try {
        const result = await refreshFinance(initial.workspace, filters);
        if(disposed) return;
        if(result.error !== undefined) setError(result.error);
        else {setSnapshot(result.data); setError("");}
      } catch {if(!disposed) setError("Não foi possível atualizar o financeiro. Tente novamente.");}
      finally {if(!disposed) {setLoading(false);setSettledFilters(filters);}}
    };
    const timer = setTimeout(fetchSnapshot, 250);
    return () => {disposed=true; clearTimeout(timer);};
  }, [initial.workspace, filters, revision]);

  // The subscription belongs to the workspace, independently of list filters.
  useEffect(() => {
    let disposed = false;
    const onVisible = () => {if(document.visibilityState === "visible") refreshAutomatically();};
    const db = createClient();
    const channel = db.channel("finance:" + initial.workspace)
      .on("postgres_changes", {event:"*",schema:"public",table:"finance_entries",filter:"workspace_id=eq." + initial.workspace}, refreshAutomatically)
      .on("postgres_changes", {event:"*",schema:"public",table:"finance_categories",filter:"workspace_id=eq." + initial.workspace}, refreshAutomatically)
      .subscribe(status => {if(!disposed) setLive(status === "SUBSCRIBED");});
    const interval = setInterval(onVisible, 60000);
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {disposed=true; clearInterval(interval); window.removeEventListener("focus",onVisible); document.removeEventListener("visibilitychange",onVisible); void db.removeChannel(channel);};
  }, [initial.workspace, refreshAutomatically]);

  return {snapshot,filters,setFilters,error,live,loading:loading || filters!==settledFilters,refresh};
}
