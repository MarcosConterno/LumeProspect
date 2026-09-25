"use client";

import { useState } from "react";
import { financeReportUrl } from "../data/validation";
import { dateLabel, entryStatus, money } from "../format";
import type { FinanceFilters, FinanceSnapshot } from "../types";
import { EntryDetail } from "./entry-detail";

const pageSize=10;

export function FinanceResults({snapshot,filters,loading,onPageChange,onSaved}:{
  snapshot:FinanceSnapshot;filters:FinanceFilters;loading:boolean;onPageChange:(page:number)=>void;onSaved:()=>void;
}) {
  const [selected,setSelected]=useState<string|null>(null);
  return <div aria-busy={loading}>
    <div className="finance-result-bar">
      <div><strong>{snapshot.count} lançamento{snapshot.count === 1 ? "" : "s"}</strong><span>Vencimentos de {dateLabel(snapshot.search.dateFrom)} a {dateLabel(snapshot.search.dateTo)}</span></div>
      {!loading && <a className="finance-primary" href={financeReportUrl(snapshot.workspace,filters)} target="_blank" rel="noopener noreferrer">Imprimir / PDF</a>}
    </div>
    <div className="finance-search-totals" aria-label="Resumo dos lançamentos encontrados">
      <article className="is-receivable"><div><span className="finance-flow-kicker">A receber</span><small>Entradas previstas</small></div><strong>{money(snapshot.search.totals.receivable)}</strong><p>Recebido: <b>{money(snapshot.search.totals.received)}</b></p></article>
      <article className="is-payable"><div><span className="finance-flow-kicker">A pagar</span><small>Saídas previstas</small></div><strong>{money(snapshot.search.totals.payable)}</strong><p>Pago: <b>{money(snapshot.search.totals.paid)}</b></p></article>
    </div>
    <p className="finance-form-note">Valores agrupados pelos lançamentos encontrados e suas baixas.</p>
    <div className="finance-table-scroll"><table className="finance-table">
      <caption className="sr-only">Lançamentos encontrados. Selecione a descrição para abrir os detalhes.</caption>
      <thead><tr><th scope="col">Descrição</th><th scope="col">Vencimento</th><th scope="col">Situação</th><th scope="col">Valor</th></tr></thead>
      <tbody>{snapshot.entries.map(entry=><tr key={entry.id}>
        <td><button type="button" className="finance-entry-link" aria-expanded={selected===entry.id} onClick={()=>setSelected(current=>current===entry.id ? null : entry.id)}>{entry.description}</button><small>{entry.companyName} · {entry.categoryName}</small><small>Lançado em {dateLabel(entry.launchDate || entry.dueDate)}</small></td>
        <td><strong className="finance-due-date">{dateLabel(entry.dueDate)}</strong><small>{entry.type === "receivable" ? "Recebimento" : "Pagamento"}</small><small>{entry.settlementDate ? `${entry.type === "receivable" ? "Recebido" : "Pago"}: ${dateLabel(entry.settlementDate)}` : entry.type === "receivable" ? "Sem recebimento" : "Sem pagamento"}</small></td><td><span className={"finance-status "+(entry.cancelledAt ? "is-cancelled" : entry.paidCents===entry.amountCents ? "is-settled" : entry.dueDate<snapshot.today ? "is-overdue" : "is-open")}>{entryStatus(entry,snapshot.today)}</span></td>
        <td className={entry.type==="receivable" ? "finance-green" : "finance-coral"}><strong>{entry.type==="receivable" ? "+ " : "− "}{money(entry.amountCents)}</strong>{entry.paidCents>0 && <small>Baixado: {money(entry.paidCents)}</small>}</td>
      </tr>)}</tbody>
    </table></div>
    {!snapshot.entries.length && <div className="finance-empty"><h3>Nenhum lançamento encontrado</h3><p>Ajuste o período ou os filtros da busca.</p></div>}
    <nav className="finance-pagination" aria-label="Páginas de lançamentos">
      <button type="button" disabled={loading || snapshot.page<=1} onClick={()=>{setSelected(null);onPageChange(snapshot.page-1);}}>Anterior</button>
      <span>Página {snapshot.page} de {Math.max(1,Math.ceil(snapshot.count/pageSize))}</span>
      <button type="button" disabled={loading || snapshot.page*pageSize>=snapshot.count} onClick={()=>{setSelected(null);onPageChange(snapshot.page+1);}}>Próxima</button>
    </nav>
    {selected && <EntryDetail key={selected} id={selected} snapshot={snapshot} onSaved={onSaved} onClose={()=>setSelected(null)}/>}
  </div>;
}
