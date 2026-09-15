"use client";

import { useState } from "react";
import { financeReportUrl } from "../data/validation";
import { dateLabel, entryStatus, money } from "../format";
import type { FinanceFilters, FinanceSnapshot } from "../types";
import { EntryDetail } from "./entry-detail";

export function FinanceResults({snapshot,filters,loading,onPageChange,onSaved}:{
  snapshot:FinanceSnapshot;filters:FinanceFilters;loading:boolean;onPageChange:(page:number)=>void;onSaved:()=>void;
}) {
  const [selected,setSelected]=useState<string|null>(null);
  return <div aria-busy={loading}>
    <div className="finance-search-results-heading">
      <p className="finance-list-count">{snapshot.count} lançamento(s) · vencimento de {dateLabel(snapshot.search.dateFrom)} a {dateLabel(snapshot.search.dateTo)}.</p>
      {!loading && <a className="finance-primary" href={financeReportUrl(snapshot.workspace,filters)} target="_blank" rel="noopener noreferrer">Imprimir / PDF</a>}
    </div>
    <div className="finance-search-totals" aria-label="Totais dos lançamentos encontrados">
      <span>A receber<strong>{money(snapshot.search.totals.receivable)}</strong></span>
      <span>A pagar<strong>{money(snapshot.search.totals.payable)}</strong></span>
      <span>Recebido nesses títulos<strong>{money(snapshot.search.totals.received)}</strong></span>
      <span>Pago nesses títulos<strong>{money(snapshot.search.totals.paid)}</strong></span>
    </div>
    <p className="finance-form-note">Totais de todos os resultados. Baixas acumuladas dos títulos encontrados, independentemente da data da baixa.</p>
    <div className="finance-table-scroll"><table className="finance-table">
      <caption className="sr-only">Lançamentos encontrados. Selecione a descrição para abrir os detalhes.</caption>
      <thead><tr><th scope="col">Descrição</th><th scope="col">Vencimento</th><th scope="col">Situação</th><th scope="col">Valor</th></tr></thead>
      <tbody>{snapshot.entries.map(entry=><tr key={entry.id}>
        <td><button type="button" className="finance-entry-link" aria-expanded={selected===entry.id} onClick={()=>setSelected(current=>current===entry.id ? null : entry.id)}>{entry.description}</button><small>{entry.companyName} · {entry.categoryName}</small></td>
        <td>{dateLabel(entry.dueDate)}</td><td><span className={"finance-status "+(entry.cancelledAt ? "is-cancelled" : entry.paidCents===entry.amountCents ? "is-settled" : entry.dueDate<snapshot.today ? "is-overdue" : "is-open")}>{entryStatus(entry,snapshot.today)}</span></td>
        <td className={entry.type==="receivable" ? "finance-green" : "finance-coral"}>{entry.type==="receivable" ? "+ " : "− "}{money(entry.amountCents)}{entry.paidCents>0 && <small>Baixado: {money(entry.paidCents)}</small>}</td>
      </tr>)}</tbody>
    </table></div>
    {!snapshot.entries.length && <div className="finance-empty"><h3>Nenhum lançamento encontrado</h3><p>Ajuste o período ou os filtros da busca.</p></div>}
    <nav className="finance-pagination" aria-label="Páginas de lançamentos">
      <button type="button" disabled={loading || snapshot.page<=1} onClick={()=>{setSelected(null);onPageChange(snapshot.page-1);}}>Anterior</button>
      <span>Página {snapshot.page} de {Math.max(1,Math.ceil(snapshot.count/30))}</span>
      <button type="button" disabled={loading || snapshot.page*30>=snapshot.count} onClick={()=>{setSelected(null);onPageChange(snapshot.page+1);}}>Próxima</button>
    </nav>
    {selected && <EntryDetail key={selected} id={selected} snapshot={snapshot} onSaved={onSaved} onClose={()=>setSelected(null)}/>}
  </div>;
}
