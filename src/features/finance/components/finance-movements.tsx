"use client";

import { useEffect, useState, type FormEvent } from "react";
import { loadFinanceMovementsClient } from "../data/client-repository";
import { dateLabel, money } from "../format";
import type { FinanceKind, FinanceMovement, FinanceSnapshot, FinanceMovements } from "../types";
import { EntryDetail } from "./entry-detail";

const pageSize=10;

export function FinanceMovements({snapshot,kind,onSaved,onNew}:{snapshot:FinanceSnapshot;kind:FinanceKind;onSaved:()=>void;onNew:()=>void}) {
  const [queryDraft,setQueryDraft]=useState("");
  const [query,setQuery]=useState("");
  const [page,setPage]=useState(1);
  const [data,setData]=useState<FinanceMovements|null>(null);
  const [selected,setSelected]=useState<FinanceMovement|null>(null);
  const [error,setError]=useState("");
  const [revision,setRevision]=useState(0);
  const requestKey=`${snapshot.workspace}:${snapshot.month}:${kind}:${query}:${page}:${revision}`;
  const [loadedRequest,setLoadedRequest]=useState<string|null>(null);
  const loading=loadedRequest!==requestKey;
  const label=kind === "receivable" ? "Entradas" : "Saídas";
  const noun=kind === "receivable" ? "recebimento" : "pagamento";

  useEffect(()=>{
    let disposed=false;
    const controller=new AbortController();
    loadFinanceMovementsClient(snapshot.workspace,{month:snapshot.month,kind,query,page},controller.signal).then(result=>{
      if(disposed) return;
      if(result.error!==undefined) {setData(null);setError(result.error);} else setData(result.data);
    }).catch(()=>{if(!disposed && !controller.signal.aborted){setData(null);setError("Não foi possível carregar as movimentações.");}}).finally(()=>{if(!disposed) setLoadedRequest(requestKey);});
    return ()=>{disposed=true;controller.abort();};
  },[snapshot.workspace,snapshot.month,kind,query,page,revision,requestKey]);

  function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setPage(1);setQuery(queryDraft.trim());
  }
  function saved() {setSelected(null);setRevision(value=>value+1);onSaved();}
  const total=data?.totalCents ?? 0;
  const visibleError=loading ? "" : error;
  return <section className={`finance-movements-panel is-${kind}`} aria-busy={loading}>
    <div className="finance-movements-heading"><div><p className="finance-movements-kicker">Caixa realizado</p><h2>{label}</h2><span>{kind === "receivable" ? "Recebimentos registrados por baixa" : "Pagamentos registrados por baixa"}</span></div><div className="finance-movements-heading-actions"><div className="finance-movements-total"><small>Total realizado no período</small><strong>{money(total)}</strong></div><button type="button" className="finance-primary" onClick={onNew}>+ Novo lançamento</button></div></div>
    <form className="finance-movements-toolbar" onSubmit={submit}><label className="finance-quick-search"><span aria-hidden="true">⌕</span><span className="sr-only">Buscar {noun}</span><input type="search" value={queryDraft} onChange={event=>setQueryDraft(event.target.value)} placeholder={`Buscar ${noun}...`}/></label><button type="submit" className="finance-primary">Buscar</button></form>
    {visibleError && <div className="finance-empty" role="alert"><h3>Não foi possível carregar</h3><p>{visibleError}</p><button type="button" onClick={()=>setRevision(value=>value+1)}>Tentar novamente</button></div>}
    {!visibleError && <>
      <div className="finance-movements-result-bar"><strong>{data?.count ?? 0} {data?.count === 1 ? noun : `${noun}s`}</strong><span>{loading ? "Atualizando..." : `Baixas de ${monthLabel(snapshot.month)}`}</span></div>
      <div className="finance-table-scroll"><table className="finance-table finance-movements-table"><caption className="sr-only">{label} realizadas. Clique na linha para abrir o lançamento de origem.</caption><thead><tr><th scope="col">Data</th><th scope="col">Descrição</th><th scope="col">Empresa</th><th scope="col">Categoria</th><th scope="col">Valor</th></tr></thead><tbody>{data?.movements.map(movement=><tr key={movement.id} data-type={movement.type} onClick={()=>setSelected(movement)}><td><strong>{dateLabel(movement.paidOn)}</strong><small>Venceu em {dateLabel(movement.dueDate)}</small></td><td><button type="button" className="finance-entry-link" onClick={()=>setSelected(movement)}>{movement.description}</button><small>Baixa registrada por {movement.actor}</small></td><td>{movement.companyName}</td><td>{movement.categoryName}</td><td className={kind === "receivable" ? "finance-green" : "finance-coral"}><strong>{kind === "receivable" ? "+ " : "− "}{money(movement.amountCents)}</strong></td></tr>)}</tbody></table></div>
      {!data?.movements.length && !loading && <div className="finance-empty"><h3>Nenhuma movimentação encontrada</h3><p>{label} aparecem aqui somente depois de uma baixa realizada.</p></div>}
      <nav className="finance-pagination" aria-label={`Páginas de ${label.toLowerCase()}`}><span className="finance-pagination-summary">{data?.count ? `Mostrando ${(data.page-1)*pageSize+1} a ${Math.min(data.page*pageSize,data.count)} de ${data.count}` : "Nenhum registro"}</span><div className="finance-pagination-controls"><button type="button" disabled={loading || !data || data.page<=1} onClick={()=>setPage(value=>value-1)}>Anterior</button><strong>{data?.page ?? 1}</strong><button type="button" disabled={loading || !data || data.page*pageSize>=data.count} onClick={()=>setPage(value=>value+1)}>Próxima</button></div></nav>
    </>}
    {selected && <EntryDetail key={selected.entryId} id={selected.entryId} initialEntry={selected.entry} snapshot={snapshot} onSaved={saved} onClose={()=>setSelected(null)}/>}
  </section>;
}

function monthLabel(value:string) {
  return new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(value+"-01T12:00:00Z"));
}
