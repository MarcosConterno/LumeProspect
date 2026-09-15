"use client";
import { useRef, useState } from "react";
import { useFinance } from "../data/use-finance";
import { dateLabel, entryStatus, money } from "../format";
import type { FinanceFilters, FinanceSnapshot } from "../types";
import { CategoryManager } from "./category-manager";
import { EntryDetail } from "./entry-detail";
import { EntryForm } from "./entry-form";
import { FinanceCharts } from "./finance-charts";
import { FinanceSearchForm } from "./search-form";
import { financeReportUrl } from "../data/validation";
import { SearchResultsDialog } from "./search-results-dialog";

export function FinanceWorkspace({initial}:{initial:FinanceSnapshot}) {
  const {snapshot,filters,setFilters,error,live,loading,refresh}=useFinance(initial);
  const [selected,setSelected]=useState<string|null>(null);
  const [showForm,setShowForm]=useState(false);
  const [showCategories,setShowCategories]=useState(false);
  const [showFilters,setShowFilters]=useState(false);
  const [searchFilters,setSearchFilters]=useState<FinanceFilters>(()=>({month:initial.month,type:"all",status:"all",query:"",page:1}));
  const [searchReset,setSearchReset]=useState(0);
  const [showSearchResults,setShowSearchResults]=useState(false);
  const searchPanel=useRef<HTMLDivElement>(null);
  const [notice,setNotice]=useState("");
  const totals=[
    {label:"A receber",value:snapshot.totals.receivable,note:"Em aberto · vencimento no mês",tone:"green"},
    {label:"A pagar",value:snapshot.totals.payable,note:"Em aberto · vencimento no mês",tone:"coral"},
    {label:"Recebido",value:snapshot.totals.received,note:"Recebimentos realizados no mês",tone:"green"},
    {label:"Pago",value:snapshot.totals.paid,note:"Pagamentos realizados no mês",tone:"neutral"},
  ];
  function saved() {setNotice("Alteração salva. Atualizando os valores...");refresh();}
  return <div className="finance-workspace">
    <header className="finance-heading"><div><p className="eyebrow">Gestão financeira</p><h1>Financeiro</h1><p>Organize seus recebimentos, pagamentos e acompanhe o mês.</p></div>
      <label className="finance-period">Mês dos indicadores<input type="month" min="1900-01" max="2100-12" value={filters.month} onChange={e=>{if(!e.target.value) return;setFilters(current=>({...current,month:e.target.value,page:1}));setSelected(null);}}/></label>
    </header>
    <div className="finance-sync"><span role="status">{loading ? "Atualizando..." : live ? "Atualização ao vivo" : "Conectando ao vivo · atualização periódica ativa"}</span><button type="button" onClick={refresh} disabled={loading}>Atualizar</button></div>
    {error ? <div role="alert" className="finance-empty"><h2>Financeiro indisponível</h2><p>{error}</p><button type="button" onClick={refresh}>Tentar novamente</button></div> : <>
      <section className="finance-metrics" aria-label={"Resumo de "+snapshot.month}>{totals.map(total=><article key={total.label}><p>{total.label}</p><strong className={"finance-"+total.tone}>{money(total.value)}</strong><span>{total.note}</span></article>)}</section>
      <div className="finance-columns">
        <section className="finance-ledger" aria-label="Lançamentos financeiros" aria-busy={loading}>
          <div className="finance-section-heading"><div><h2>Lançamentos</h2><p>Contas a pagar e a receber</p></div><div className="finance-actions">
            <button type="button" onClick={()=>setShowFilters(value=>!value)} aria-expanded={showFilters} aria-controls="finance-search-filters">{showFilters ? "Ocultar filtros" : "Filtrar"}</button>
            {snapshot.permissions.categories && <button type="button" onClick={()=>setShowCategories(value=>!value)} aria-expanded={showCategories}>Categorias</button>}
            {snapshot.permissions.create && <button type="button" className="finance-primary" onClick={()=>setShowForm(value=>!value)} aria-expanded={showForm}>{showForm ? "Fechar cadastro" : "+ Novo lançamento"}</button>}
          </div></div>
          {showCategories && snapshot.permissions.categories && <CategoryManager workspace={snapshot.workspace} categories={snapshot.categories} onSaved={saved}/>}
          {showForm && snapshot.permissions.create && <EntryForm workspace={snapshot.workspace} categories={snapshot.categories} today={snapshot.today} onSaved={()=>{setShowForm(false);saved();}} onClose={()=>setShowForm(false)}/>}
          {notice && <p role="status" className="finance-local-notice">{loading ? notice : "Alteração salva."}</p>}
          <div className="finance-tabs" aria-label="Tipo de lançamento">{[["all","Todos"],["receivable","A receber"],["payable","A pagar"]].map(([key,label])=><button key={key} type="button" aria-pressed={filters.type===key} onClick={()=>setFilters(current=>({...current,type:key,page:1}))}>{label}</button>)}</div>
          <div ref={searchPanel} id="finance-search-filters" hidden={!showFilters}>
            <FinanceSearchForm key={searchReset} filters={searchFilters} categories={snapshot.categories}
              onApply={next=>{setSearchFilters(next);setShowSearchResults(true);}}
              onClear={()=>{setSearchFilters({month:filters.month,type:"all",status:"all",query:"",page:1});setSearchReset(value=>value+1);}}/>
          </div>
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
          <p className="finance-form-note">Totais de todos os resultados. Baixas acumuladas dos títulos encontrados, independentemente da data da baixa. Este PDF usa o mês e o tipo da lista principal. Para imprimir uma busca personalizada, use Imprimir / PDF dentro dos resultados da busca.</p>
          <div className="finance-table-scroll"><table className="finance-table"><caption className="sr-only">Contas do período. Clique na descrição para abrir os detalhes.</caption><thead><tr><th scope="col">Descrição</th><th scope="col">Vencimento</th><th scope="col">Situação</th><th scope="col">Valor</th></tr></thead><tbody>
            {snapshot.entries.map(entry=><tr key={entry.id}><td><button type="button" className="finance-entry-link" aria-expanded={selected===entry.id} onClick={()=>setSelected(current=>current===entry.id ? null : entry.id)}>{entry.description}</button><small>{entry.companyName} · {entry.categoryName}</small></td><td>{dateLabel(entry.dueDate)}</td><td><span className={"finance-status "+(entry.cancelledAt ? "is-cancelled" : entry.paidCents===entry.amountCents ? "is-settled" : entry.dueDate<snapshot.today ? "is-overdue" : "is-open")}>{entryStatus(entry,snapshot.today)}</span></td><td className={entry.type==="receivable" ? "finance-green" : "finance-coral"}>{entry.type==="receivable" ? "+ " : "− "}{money(entry.amountCents)}{entry.paidCents>0 && <small>Baixado: {money(entry.paidCents)}</small>}</td></tr>)}
          </tbody></table></div>
          {!snapshot.entries.length && <div className="finance-empty"><h3>Nenhum lançamento encontrado</h3><p>Cadastre um lançamento ou ajuste o período e os filtros.</p></div>}
          <nav className="finance-pagination" aria-label="Páginas de lançamentos"><button type="button" disabled={loading || snapshot.page<=1} onClick={()=>setFilters(current=>({...current,page:snapshot.page-1}))}>Anterior</button><span>Página {snapshot.page} de {Math.max(1,Math.ceil(snapshot.count/30))}</span><button type="button" disabled={loading || snapshot.page*30>=snapshot.count} onClick={()=>setFilters(current=>({...current,page:snapshot.page+1}))}>Próxima</button></nav>
          {selected && <EntryDetail key={selected} id={selected} snapshot={snapshot} onSaved={saved} onClose={()=>setSelected(null)}/>}
        </section>
        <FinanceCharts snapshot={snapshot}/>
      </div>
    </>}
    {showSearchResults && searchFilters && <SearchResultsDialog initialFilters={searchFilters} source={snapshot} returnFocusRef={searchPanel}
      onClose={()=>setShowSearchResults(false)} onSaved={refresh}/>}
  </div>;
}
