"use client";

import { useEffect, useState, type FormEvent } from "react";
import { loadFinanceReversedMovementsClient } from "../data/client-repository";
import { dateLabel, money } from "../format";
import type { FinanceReversedMovement, FinanceReversedMovements, FinanceSnapshot } from "../types";
import { EntryDetail } from "./entry-detail";

const pageSize=10;

export function FinanceReversedMovements({snapshot,onSaved}:{snapshot:FinanceSnapshot;onSaved:()=>void}) {
  const [queryDraft,setQueryDraft]=useState("");
  const [query,setQuery]=useState("");
  const [page,setPage]=useState(1);
  const [data,setData]=useState<FinanceReversedMovements|null>(null);
  const [selected,setSelected]=useState<FinanceReversedMovement|null>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  const [revision,setRevision]=useState(0);

  useEffect(()=>{
    let disposed=false;
    const timer=window.setTimeout(()=>{
      setLoading(true);setError("");
      loadFinanceReversedMovementsClient(snapshot.workspace,{month:snapshot.month,query,page}).then(result=>{
        if(disposed) return;
        if(result.error!==undefined) {setData(null);setError(result.error);} else setData(result.data);
      }).catch(()=>{if(!disposed){setData(null);setError("Não foi possível carregar os estornos.");}}).finally(()=>{if(!disposed) setLoading(false);});
    },180);
    return ()=>{disposed=true;window.clearTimeout(timer);};
  },[snapshot.workspace,snapshot.month,query,page,revision]);

  function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setPage(1);setQuery(queryDraft.trim());
  }
  function saved() {setSelected(null);setRevision(value=>value+1);onSaved();}
  const total=data?.totalCents ?? 0;
  return <section className="finance-movements-panel is-reversed" aria-busy={loading}>
    <div className="finance-movements-heading"><div><p className="finance-movements-kicker">Auditoria financeira</p><h2>Estornados</h2><span>Baixas retiradas do caixa, com motivo e responsável</span></div><div className="finance-movements-total"><small>Total estornado no período</small><strong>{money(total)}</strong></div></div>
    <form className="finance-movements-toolbar" onSubmit={submit}><label className="finance-quick-search"><span aria-hidden="true">⌕</span><span className="sr-only">Buscar estorno</span><input type="search" value={queryDraft} onChange={event=>setQueryDraft(event.target.value)} placeholder="Buscar estorno..."/></label><button type="submit" className="finance-primary">Buscar</button></form>
    {error && <div className="finance-empty" role="alert"><h3>Não foi possível carregar</h3><p>{error}</p><button type="button" onClick={()=>setRevision(value=>value+1)}>Tentar novamente</button></div>}
    {!error && <>
      <div className="finance-movements-result-bar"><strong>{data?.count ?? 0} estorno{data?.count === 1 ? "" : "s"}</strong><span>{loading ? "Atualizando..." : `Estornos de ${monthLabel(snapshot.month)}`}</span></div>
      <div className="finance-table-scroll"><table className="finance-table finance-movements-table finance-reversed-table"><caption className="sr-only">Baixas estornadas. Clique na linha para abrir o lançamento de origem.</caption><thead><tr><th scope="col">Estornado em</th><th scope="col">Lançamento</th><th scope="col">Tipo</th><th scope="col">Motivo</th><th scope="col">Valor</th></tr></thead><tbody>{data?.movements.map(movement=><tr key={movement.id} data-type={movement.type} onClick={()=>setSelected(movement)}><td><strong>{dateLabel(movement.reversedOn)}</strong><small>Baixado em {dateLabel(movement.paidOn)}</small></td><td><button type="button" className="finance-entry-link" onClick={()=>setSelected(movement)}>{movement.description}</button><small>{movement.companyName}</small></td><td><span className={`finance-kind-badge ${movement.type}`}>{movement.type === "receivable" ? "Entrada" : "Saída"}</span></td><td><span>{movement.reverseReason}</span><small>Por {movement.reverseActor}</small></td><td className={movement.type === "receivable" ? "finance-green" : "finance-coral"}><strong>{movement.type === "receivable" ? "+ " : "− "}{money(movement.amountCents)}</strong></td></tr>)}</tbody></table></div>
      {!data?.movements.length && !loading && <div className="finance-empty"><h3>Nenhum estorno encontrado</h3><p>Estornos realizados no período aparecerão aqui para conferência.</p></div>}
      <nav className="finance-pagination" aria-label="Páginas de estornos"><span className="finance-pagination-summary">{data?.count ? `Mostrando ${(data.page-1)*pageSize+1} a ${Math.min(data.page*pageSize,data.count)} de ${data.count}` : "Nenhum registro"}</span><div className="finance-pagination-controls"><button type="button" disabled={loading || !data || data.page<=1} onClick={()=>setPage(value=>value-1)}>Anterior</button><strong>{data?.page ?? 1}</strong><button type="button" disabled={loading || !data || data.page*pageSize>=data.count} onClick={()=>setPage(value=>value+1)}>Próxima</button></div></nav>
    </>}
    {selected && <EntryDetail key={selected.entryId} id={selected.entryId} initialEntry={selected.entry} snapshot={snapshot} onSaved={saved} onClose={()=>setSelected(null)}/>}
  </section>;
}

function monthLabel(value:string) {
  return new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(value+"-01T12:00:00Z"));
}
