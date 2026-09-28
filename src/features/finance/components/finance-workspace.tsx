"use client";
import { useRef, useState } from "react";
import { useFinance } from "../data/use-finance";
import { dateLabel, entryStatus, money, percentChange, percentLabel } from "../format";
import type { FinanceFilters, FinanceKind, FinanceSnapshot } from "../types";
import Link from "next/link";
import { EntryCreatePanel } from "./entry-create-panel";
import { EntryDetail } from "./entry-detail";
import { FinanceCharts } from "./finance-charts";
import { FinanceMovements } from "./finance-movements";
import { FinanceReversedMovements } from "./finance-reversed-movements";
import { FinanceSearchForm } from "./search-form";
import { financeReportUrl } from "../data/validation";
import { SearchResultsDialog } from "./search-results-dialog";

const pageSize=10;
type FinanceView="overview"|"entries"|"incomes"|"outcomes"|"reversed";
const quickStatuses = [["all","Situação"],["any","Todos, inclusive cancelados"],["open","Em aberto"],["overdue","Em atraso"],["partial","Baixa parcial"],["settled","Pagos e recebidos"],["cancelled","Cancelados"]] as const;

function monthShift(value:string, offset:number) {
  const date=new Date(value+"-01T12:00:00Z");
  date.setUTCMonth(date.getUTCMonth()+offset);
  return date.toISOString().slice(0,7);
}

function monthCaption(value:string) {
  return new Intl.DateTimeFormat("pt-BR",{month:"short",year:"numeric",timeZone:"UTC"}).format(new Date(value+"-01T12:00:00Z"));
}

function tableStatus(entry:FinanceSnapshot["entries"][number], today:string) {
  const status=entryStatus(entry,today);
  return status === "Em aberto" ? "Pendente" : status;
}

function MetricIcon({name}:{name:string}) {
  const common={viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"1.8",strokeLinecap:"round" as const,strokeLinejoin:"round" as const,"aria-hidden":true};
  if(name === "Movimentação líquida") return <svg {...common}><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M7 6V4.5A1.5 1.5 0 0 1 8.5 3h8A1.5 1.5 0 0 1 18 4.5V6"/><path d="M15 12h6v4h-6a2 2 0 0 1 0-4Z"/><circle cx="16" cy="14" r=".6" fill="currentColor" stroke="none"/></svg>;
  if(name === "A receber") return <svg {...common}><path d="M5 5 19 19"/><path d="M19 19v-6"/><path d="M19 19h-6"/></svg>;
  if(name === "A pagar") return <svg {...common}><path d="M5 19 19 5"/><path d="M19 5v6"/><path d="M19 5h-6"/></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg>;
}

export function FinanceWorkspace({initial}:{initial:FinanceSnapshot}) {
  const {snapshot,filters,setFilters,error,live,loading,refresh}=useFinance(initial);
  const [selected,setSelected]=useState<string|null>(null);
  const [editingEntry,setEditingEntry]=useState<string|null>(null);
  const [showForm,setShowForm]=useState(false);
  const [createKind,setCreateKind]=useState<FinanceKind>("receivable");
  const [createKindLocked,setCreateKindLocked]=useState(false);
  const [showFilters,setShowFilters]=useState(false);
  const [searchFilters,setSearchFilters]=useState<FinanceFilters>(()=>({month:initial.month,type:"all",status:"all",query:"",page:1}));
  const [searchReset,setSearchReset]=useState(0);
  const [showSearchResults,setShowSearchResults]=useState(false);
  const [activeView,setActiveView]=useState<FinanceView>("overview");
  const [visitedViews,setVisitedViews]=useState<FinanceView[]>(["overview"]);
  const searchPanel=useRef<HTMLDivElement>(null);
  const [notice,setNotice]=useState("");
  const [queryDraft,setQueryDraft]=useState("");
  const monthIndex=Number(snapshot.month.slice(5,7))-1;
  const currentMonth=snapshot.monthly[monthIndex];
  const previousMonth=snapshot.monthly[monthIndex-1];
  const balanceChange=currentMonth && previousMonth ? percentChange(currentMonth.receivable-currentMonth.payable,previousMonth.receivable-previousMonth.payable) : null;
  const periodBalance=snapshot.totals.received-snapshot.totals.paid;
  const totals=[
    {label:"Movimentação líquida",value:periodBalance,note:balanceChange === null ? "Recebido − pago no mês" : `${balanceChange >= 0 ? "↑" : "↓"} ${percentLabel(balanceChange)} comparado ao mês anterior`,tone:periodBalance < 0 ? "coral" : "green",icon:"◉",primary:true},
    {label:"A receber",value:snapshot.totals.receivable,note:`${snapshot.totals.receivableOpenCount} lançamento${snapshot.totals.receivableOpenCount === 1 ? "" : "s"} em aberto`,tone:"neutral",icon:"↙",primary:false},
    {label:"A pagar",value:snapshot.totals.payable,note:`${snapshot.totals.payableOpenCount} lançamento${snapshot.totals.payableOpenCount === 1 ? "" : "s"} em aberto`,tone:"coral",icon:"↗",primary:false},
    {label:"Em atraso",value:snapshot.totals.overdue,note:`${snapshot.totals.overdueCount} lançamento${snapshot.totals.overdueCount === 1 ? "" : "s"} vencido${snapshot.totals.overdueCount === 1 ? "" : "s"}`,tone:"coral",icon:"◷",primary:false},
  ];
  function saved() {setNotice("Alteração salva. Atualizando os valores...");refresh();}
  function openCreate(kind?:FinanceKind) {setSelected(null);setCreateKind(kind ?? "receivable");setCreateKindLocked(kind !== undefined);setShowForm(true);}
  function openCreateFromEntries() {openCreate(filters.type === "receivable" ? "receivable" : filters.type === "payable" ? "payable" : undefined);}
  function prepareView(view:FinanceView) {
    setVisitedViews(current=>current.includes(view) ? current : [...current,view]);
  }
  function selectView(view:FinanceView) {
    setSelected(null);setEditingEntry(null);
    setShowForm(false);
    prepareView(view);
    setActiveView(view);
  }
  return <div className="finance-workspace">
    <header className="finance-heading"><div><p className="eyebrow">Gestão financeira</p><h1>Financeiro</h1><p>Visão financeira da operação.</p></div></header>
    {error ? <div role="alert" className="finance-empty"><h2>Financeiro indisponível</h2><p>{error}</p><button type="button" onClick={refresh}>Tentar novamente</button></div> : <>
      <div className="finance-heading-navigation">
        <nav className="finance-page-tabs" aria-label="Seções do financeiro">
          <button type="button" className={activeView==="overview" ? "is-active" : ""} aria-current={activeView==="overview" ? "page" : undefined} onClick={()=>selectView("overview")}>Visão geral</button>
          <button type="button" className={activeView==="entries" ? "is-active" : ""} aria-current={activeView==="entries" ? "page" : undefined} onClick={()=>selectView("entries")}>Lançamentos <span>{snapshot.count}</span></button>
          <button type="button" className={activeView==="incomes" ? "is-active is-receivable" : ""} aria-current={activeView==="incomes" ? "page" : undefined} onClick={()=>selectView("incomes")}>Entradas</button>
          <button type="button" className={activeView==="outcomes" ? "is-active is-payable" : ""} aria-current={activeView==="outcomes" ? "page" : undefined} onClick={()=>selectView("outcomes")}>Saídas</button>
          <button type="button" className={activeView==="reversed" ? "is-active is-reversed" : ""} aria-current={activeView==="reversed" ? "page" : undefined} onClick={()=>selectView("reversed")}>Estornados</button>
        </nav>
        <div className="finance-heading-tools"><label className="finance-period"><span className="sr-only">Mês dos indicadores</span><input aria-label="Mês dos indicadores" type="month" min="1900-01" max="2100-12" value={filters.month} onChange={e=>{if(!e.target.value) return;setFilters(current=>({...current,month:e.target.value,page:1}));setSelected(null);}}/></label><button type="button" className="finance-refresh" onClick={refresh} disabled={loading}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 0 0-13.5-4.8L4 8.5"/><path d="M4 4v4.5h4.5"/><path d="M4 13a8 8 0 0 0 13.5 4.8l2.5-2.3"/><path d="M20 20v-4.5h-4.5"/></svg><span>Atualizar</span></button><span className="sr-only" role="status">{loading ? "Atualizando" : live ? "Atualização ao vivo" : "Atualização periódica ativa"}</span></div>
      </div>
      {activeView === "overview" && <>
        <section className="finance-metrics" aria-label={"Resumo de "+snapshot.month}>{totals.map(total=><article key={total.label} className={`${total.primary ? "is-primary" : ""}${total.primary && total.value < 0 ? " is-negative" : ""}`}><div className="finance-metric-heading"><span className={`finance-metric-icon is-${total.tone}`} aria-hidden="true"><MetricIcon name={total.label}/></span><p>{total.label}</p></div><strong className={"finance-"+total.tone}>{total.value < 0 ? "− " : ""}{money(Math.abs(total.value))}</strong><span>{total.note}</span></article>)}</section>
        <FinanceCharts snapshot={snapshot} onOpenEntries={()=>selectView("entries")} onOpenEntry={id=>{selectView("entries");setSelected(id);}}/>
      </>}
      {(activeView === "entries" || visitedViews.includes("entries")) && <section id="finance-lancamentos" hidden={activeView !== "entries"} className="finance-ledger" aria-label="Lançamentos financeiros" aria-busy={activeView === "entries" && loading}>
          <div className="finance-section-heading"><div><h2>Lançamentos</h2><p>Contas a pagar e receber</p></div><div className="finance-actions">
            {snapshot.permissions.categories && <Link href="/configuracoes/financeiro">Configurações</Link>}
            {snapshot.permissions.create && <button type="button" className="finance-primary" onClick={()=>showForm ? setShowForm(false) : openCreateFromEntries()} aria-expanded={showForm}>{showForm ? "Fechar cadastro" : "+ Novo lançamento"}</button>}
          </div></div>
          <>
          {notice && <p role="status" className="finance-local-notice">{loading ? notice : "Alteração salva."}</p>}
          <div className="finance-tabs" aria-label="Filtros dos lançamentos">{[["all","Todos","all"],["receivable","A receber","open"],["payable","A pagar","open"],["all","Vencidos","overdue"]].map(([type,label,status])=><button key={label} type="button" aria-pressed={filters.type===type && filters.status===status} onClick={()=>setFilters(current=>({...current,type,status,page:1}))}>{label}</button>)}</div>
          <form className="finance-entry-toolbar" onSubmit={event=>{event.preventDefault();setFilters(current=>({...current,query:queryDraft.trim(),page:1}));}}>
            <label className="finance-quick-search"><span aria-hidden="true">⌕</span><span className="sr-only">Buscar lançamento</span><input type="search" value={queryDraft} onChange={event=>setQueryDraft(event.target.value)} onBlur={()=>{if(queryDraft.trim()!==filters.query) setFilters(current=>({...current,query:queryDraft.trim(),page:1}));}} placeholder="Buscar lançamento..."/></label>
            <label className="finance-quick-select"><span className="sr-only">Período</span><select aria-label="Período" value={filters.month} onChange={event=>setFilters(current=>({...current,month:event.target.value,page:1}))}><option value={monthShift(filters.month,-1)}>{monthCaption(monthShift(filters.month,-1))}</option><option value={filters.month}>Período</option><option value={monthShift(filters.month,1)}>{monthCaption(monthShift(filters.month,1))}</option></select></label>
            <label className="finance-quick-select"><span className="sr-only">Categoria</span><select aria-label="Categoria" value={filters.categoryId ?? ""} onChange={event=>setFilters(current=>({...current,categoryId:event.target.value || undefined,page:1}))}><option value="">Categoria</option>{snapshot.categories.filter(category=>category.active).map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label className="finance-quick-select"><span className="sr-only">Situação</span><select aria-label="Situação" value={filters.status} onChange={event=>{const status=event.target.value;setFilters(current=>({...current,status,page:1}));}}>{quickStatuses.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
            <button type="button" className="finance-filter-button" onClick={()=>setShowFilters(value=>!value)} aria-expanded={showFilters} aria-controls="finance-search-filters"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/><circle cx="9" cy="7" r="2" fill="var(--surface)"/><circle cx="15" cy="12" r="2" fill="var(--surface)"/><circle cx="11" cy="17" r="2" fill="var(--surface)"/></svg><span>Filtros</span></button>
          </form>
          <div ref={searchPanel} id="finance-search-filters" hidden={!showFilters}>
            <FinanceSearchForm key={searchReset} filters={searchFilters} categories={snapshot.categories}
              onApply={next=>{setSearchFilters(next);setShowSearchResults(true);}}
              onClear={()=>{setSearchFilters({month:filters.month,type:"all",status:"all",query:"",page:1});setSearchReset(value=>value+1);}}/>
          </div>
          <div className="finance-result-bar">
            <div><strong>{snapshot.count} lançamento{snapshot.count === 1 ? "" : "s"}</strong><span>Vencimentos de {dateLabel(snapshot.search.dateFrom)} a {dateLabel(snapshot.search.dateTo)}</span></div>
            {!loading && <a className="finance-primary" href={financeReportUrl(snapshot.workspace,filters)} target="_blank" rel="noopener noreferrer">Imprimir / PDF</a>}
          </div>
          <div className="finance-table-scroll"><table className="finance-table"><caption className="sr-only">Contas do período. Clique na linha para abrir os detalhes.</caption><thead><tr><th scope="col">Descrição</th><th scope="col">Cliente</th><th scope="col">Categoria</th><th scope="col">Vencimento</th><th scope="col">Situação</th><th scope="col">Valor</th><th scope="col">Ações</th></tr></thead><tbody>
            {snapshot.entries.map(entry=><tr key={entry.id} data-type={entry.type} onClick={()=>{setEditingEntry(null);setSelected(entry.id);}}><td className="finance-table-description"><button type="button" className="finance-entry-link" aria-expanded={selected===entry.id && !editingEntry} onClick={event=>{event.stopPropagation();setEditingEntry(null);setSelected(entry.id);}}>{entry.description}</button><small>{entry.type === "receivable" ? "A receber" : "A pagar"}</small></td><td className="finance-table-company">{entry.companyName}</td><td className="finance-table-category"><span className="finance-category-label">{entry.categoryName}</span></td><td className="finance-table-date"><strong>{dateLabel(entry.dueDate)}</strong></td><td><span className={"finance-status "+(entry.cancelledAt ? "is-cancelled" : entry.paidCents===entry.amountCents ? "is-settled" : entry.dueDate<snapshot.today ? "is-overdue" : "is-open")}>{tableStatus(entry,snapshot.today)}</span></td><td className={`finance-table-value ${entry.type==="receivable" ? "finance-green" : "finance-coral"}`}><strong>{entry.type==="receivable" ? "+ " : "− "}{money(entry.amountCents)}</strong>{entry.paidCents>0 && <small>Baixado: {money(entry.paidCents)}</small>}</td><td className="finance-table-actions"><button type="button" className="finance-action-icon" title="Editar lançamento" aria-label={`Editar ${entry.description}`} onClick={event=>{event.stopPropagation();setSelected(entry.id);setEditingEntry(snapshot.permissions.update && !entry.cancelledAt ? entry.id : null);}}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m4 16-.8 4.8L8 20l11.3-11.3a2.2 2.2 0 0 0-3.1-3.1L4.9 16.9Z"/><path d="m14.8 6.2 3.1 3.1"/></svg></button><button type="button" className="finance-action-icon" title="Abrir ações" aria-label={`Abrir ações de ${entry.description}`} onClick={event=>{event.stopPropagation();setEditingEntry(null);setSelected(entry.id);}}>⋯</button></td></tr>)}
          </tbody></table></div>
          {!snapshot.entries.length && <div className="finance-empty"><h3>Nenhum lançamento encontrado</h3><p>Cadastre um lançamento ou ajuste o período e os filtros.</p></div>}
          <nav className="finance-pagination" aria-label="Páginas de lançamentos"><span className="finance-pagination-summary">{snapshot.count ? `Mostrando ${(snapshot.page-1)*pageSize+1} a ${Math.min(snapshot.page*pageSize,snapshot.count)} de ${snapshot.count} lançamentos` : "Nenhum lançamento"}</span><div className="finance-pagination-controls"><button type="button" disabled={loading || snapshot.page<=1} onClick={()=>setFilters(current=>({...current,page:snapshot.page-1}))}>Anterior</button><strong>{snapshot.page}</strong><button type="button" disabled={loading || snapshot.page*pageSize>=snapshot.count} onClick={()=>setFilters(current=>({...current,page:snapshot.page+1}))}>Próxima</button></div></nav>
          {selected && <EntryDetail key={`${selected}:${editingEntry === selected ? "edit" : "view"}`} id={selected} snapshot={snapshot} initialEditing={editingEntry === selected} onSaved={saved} onClose={()=>{setSelected(null);setEditingEntry(null);}}/>}
          </>
      </section>}
      {(activeView === "incomes" || visitedViews.includes("incomes")) && <section hidden={activeView !== "incomes"} className="finance-ledger" aria-label="Entradas financeiras" aria-busy={activeView === "incomes" && loading}><FinanceMovements key={`${snapshot.month}:receivable`} snapshot={snapshot} kind="receivable" onSaved={saved} onNew={()=>openCreate("receivable")}/></section>}
      {(activeView === "outcomes" || visitedViews.includes("outcomes")) && <section hidden={activeView !== "outcomes"} className="finance-ledger" aria-label="Saídas financeiras" aria-busy={activeView === "outcomes" && loading}><FinanceMovements key={`${snapshot.month}:payable`} snapshot={snapshot} kind="payable" onSaved={saved} onNew={()=>openCreate("payable")}/></section>}
      {(activeView === "reversed" || visitedViews.includes("reversed")) && <section hidden={activeView !== "reversed"} className="finance-ledger" aria-label="Estornos financeiros" aria-busy={activeView === "reversed" && loading}><FinanceReversedMovements key={snapshot.month} snapshot={snapshot} onSaved={saved}/></section>}
    </>}
    {!error && showForm && snapshot.permissions.create && <EntryCreatePanel workspace={snapshot.workspace} categories={snapshot.categories} today={snapshot.today} kind={createKind} kindLocked={createKindLocked} onSaved={()=>{setShowForm(false);saved();}} onClose={()=>setShowForm(false)}/>}
    {showSearchResults && searchFilters && <SearchResultsDialog initialFilters={searchFilters} source={snapshot} returnFocusRef={searchPanel}
      onClose={()=>setShowSearchResults(false)} onSaved={refresh}/>}
  </div>;
}
