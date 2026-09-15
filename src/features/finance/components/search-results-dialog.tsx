"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { refreshFinance } from "../actions";
import { financeFilterSummary } from "../search";
import type { FinanceFilters, FinanceSnapshot } from "../types";
import { FinanceResults } from "./finance-results";

export function SearchResultsDialog({initialFilters,source,onClose,onSaved,returnFocusRef}:{
  initialFilters:FinanceFilters;source:FinanceSnapshot;onClose:()=>void;onSaved:()=>void;
  returnFocusRef:RefObject<HTMLDivElement|null>;
}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const closeButton=useRef<HTMLButtonElement>(null);
  const titleId=useId();
  const [filters,setFilters]=useState(initialFilters);
  const [snapshot,setSnapshot]=useState<FinanceSnapshot|null>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  const [revision,setRevision]=useState(0);

  useEffect(()=>{
    const element=dialog.current;
    const returnFocusElement=returnFocusRef.current;
    const previousFocus=document.activeElement;
    const overflow=document.body.style.overflow;
    element?.showModal();
    closeButton.current?.focus();
    document.body.style.overflow="hidden";
    return ()=>{
      element?.close();
      document.body.style.overflow=overflow;
      if(previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
      returnFocusElement?.querySelector<HTMLButtonElement>('button[type="submit"]')?.focus();
    };
  },[returnFocusRef]);

  useEffect(()=>{
    let disposed=false;
    refreshFinance(source.workspace,filters).then(result=>{
      if(disposed) return;
      if(result.error!==undefined) {setError(result.error);setSnapshot(null);}
      else {setSnapshot(result.data);setError("");}
    }).catch(()=>{if(!disposed) {setSnapshot(null);setError("Não foi possível carregar a busca. Tente novamente.");}})
      .finally(()=>{if(!disposed) setLoading(false);});
    return ()=>{disposed=true;};
  },[source,filters,revision]);

  function retry() {setLoading(true);setError("");setRevision(value=>value+1);}

  return <dialog ref={dialog} className="finance-results-dialog" aria-labelledby={titleId} onCancel={event=>{event.preventDefault();onClose();}}>
    <div className="finance-dialog-heading"><div><p>Financeiro</p><h2 id={titleId}>Resultados da busca</h2></div>
      <button ref={closeButton} type="button" onClick={onClose}>Fechar</button>
    </div>
    <div className="finance-dialog-content">
      {loading && <p role="status" className="finance-local-notice">Buscando lançamentos...</p>}
      {error && <div role="alert" className="finance-empty"><p>{error}</p><button type="button" onClick={retry}>Tentar novamente</button></div>}
      {snapshot && !error && <>
        <ul className="finance-dialog-criteria" aria-label="Filtros da busca">{financeFilterSummary(filters,snapshot.search).map(item=><li key={item}>{item}</li>)}</ul>
        <FinanceResults snapshot={snapshot} filters={filters} loading={loading}
          onPageChange={page=>{setLoading(true);setFilters(current=>({...current,page}));}}
          onSaved={()=>{retry();onSaved();}}/>
      </>}
    </div>
  </dialog>;
}
