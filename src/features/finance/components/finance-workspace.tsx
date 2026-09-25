"use client";
import { useEffect, useRef, useState } from "react";
import { useFinance } from "../data/use-finance";
import { dateLabel, entryStatus, money, percentChange, percentLabel } from "../format";
import type { FinanceFilters, FinanceSnapshot } from "../types";
import Link from "next/link";
import { EntryDetail } from "./entry-detail";
import { EntryForm } from "./entry-form";
import { FinanceCharts } from "./finance-charts";
import { FinanceSearchForm } from "./search-form";
import { financeReportUrl } from "../data/validation";
import { SearchResultsDialog } from "./search-results-dialog";

const pageSize=10;
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
  if(name === "Saldo do período") return <svg {...common}><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M7 6V4.5A1.5 1.5 0 0 1 8.5 3h8A1.5 1.5 0 0 1 18 4.5V6"/><path d="M15 12h6v4h-6a2 2 0 0 1 0-4Z"/><circle cx="16" cy="14" r=".6" fill="currentColor" stroke="none"/></svg>;
  if(name === "A receber") return <svg {...common}><path d="M5 5 19 19"/><path d="M19 19v-6"/><path d="M19 19h-6"/></svg>;
  if(name === "A pagar") return <svg {...common}><path d="M5 19 19 5"/><path d="M19 5v6"/><path d="M19 5h-6"/></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg>;
}

function EditIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m4 16-.8 4.8L8 20l11.5-11.5a2.1 2.1 0 0 0-3-3L5 17"/><path d="m14.5 7.5 3 3"/></svg>;
}

function MoreIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>;
}

export function FinanceWorkspace({initial}:{initial:FinanceSnapshot}) {
  const {snapshot,filters,setFilters,error,live,loading,refresh}=useFinance(initial);
  const [selected,setSelected]=useState<string|null>(null);
  const [showForm,setShowForm]=useState(false);
  const [showFilters,setShowFilters]=useState(false);
  const [searchFilters,setSearchFilters]=useState<FinanceFilters>(()=>({month:initial.month,type:"all",status:"all",query:"",page:1}));
  const [searchReset,setSearchReset]=useState(0);
  const [showSearchResults,setShowSearchResults]=useState(false);
  const [activeView,setActiveView]=useState<"overview"|"entries">("overview");
  const searchPanel=useRef<HTMLDivElement>(null);
  const [notice,setNotice]=useState("");
  const [queryDraft,setQueryDraft]=useState("");
  const monthIndex=Number(snapshot.month.slice(5,7))-1;
  const currentMonth=snapshot.monthly[monthIndex];
  const previousMonth=snapshot.monthly[monthIndex-1];
  const balanceChange=currentMonth && previousMonth ? percentChange(currentMonth.receivable-currentMonth.payable,previousMonth.receivable-previousMonth.payable) : null;
  const periodBalance=snapshot.totals.received-snapshot.totals.paid;
  const totals=[
    {label:"Saldo do período",value:periodBalance,note:balanceChange === null ? "Recebido − pago no mês" : `${balanceChange >= 0 ? "↑" : "↓"} ${percentLabel(balanceChange)} comparado ao mês anterior`,tone:periodBalance < 0 ? "coral" : "green",icon:"◉",primary:true},
    {label:"A receber",value:snapshot.totals.receivable,note:`${snapshot.totals.receivableOpenCount} lançamento${snapshot.totals.receivableOpenCount === 1 ? "" : "s"} em aberto`,tone:"neutral",icon:"↙",primary:false},
    {label:"A pagar",value:snapshot.totals.payable,note:`${snapshot.totals.payableOpenCount} lançamento${snapshot.totals.payableOpenCount === 1 ? "" : "s"} em aberto`,tone:"coral",icon:"↗",primary:false},
    {label:"Em atraso",value:snapshot.totals.overdue,note:`${snapshot.totals.overdueCount} lançamento${snapshot.totals.overdueCount === 1 ? "" : "s"} vencido${snapshot.totals.overdueCount === 1 ? "" : "s"}`,tone:"coral",icon:"◷",primary:false},
  ];
  useEffect(()=>{
    if(activeView !== "entries" || !selected) return;
    const frame=window.requestAnimationFrame(()=>document.getElementById("finance-entry-detail")?.scrollIntoView({behavior:"smooth",block:"start"}));
    return ()=>window.cancelAnimationFrame(frame);
  },[activeView,selected]);
  function saved() {setNotice("Alteração salva. Atualizando os valores...");refresh();}
  return <div className="finance-workspace">
    <header className="finance-heading"><div><p className="eyebrow">Gestão financeira</p><h1>Financeiro</h1><p>Visão financeira da operação.</p></div>
      <div className="finance-heading-tools"><label className="finance-period"><span className="sr-only">Mês dos indicadores</span><input aria-label="Mês dos indicadores" type="month" min="1900-01" max="2100-12" value={filters.month} onChange={e=>{if(!e.target.value) return;setFilters(current=>({...current,month:e.target.value,page:1}));setSelected(null);}}/></label><button type="button" className="finance-refresh" onClick={refresh} disabled={loading}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 0 0-13.5-4.8L4 8.5"/><path d="M4 4v4.5h4.5"/><path d="M4 13a8 8 0 0 0 13.5 4.8l2.5-2.3"/><path d="M20 20v-4.5h-4.5"/></svg><span>Atualizar</span></button><span className="sr-only" role="status">{loading ? "Atualizando" : live ? "Atualização ao vivo" : "Atualização periódica ativa"}</span></div>
    </header>
    {error ? <div role="alert" className="finance-empty"><h2>Financeiro indisponível</h2><p>{error}</p><button type="button" onClick={refresh}>Tentar novamente</button></div> : <>
      <nav className="finance-page-tabs" aria-label="Seções do financeiro">
        <button type="button" className={activeView==="overview" ? "is-active" : ""} aria-current={activeView==="overview" ? "page" : undefined} onClick={()=>setActiveView("overview")}>Visão geral</button>
        <button type="button" className={activeView==="entries" ? "is-active" : ""} aria-current={activeView==="entries" ? "page" : undefined} onClick={()=>setActiveView("entries")}>Lançamentos <span>{snapshot.count}</span></button>
      </nav>
      {activeView === "overview" && <>
        <section className="finance-metrics" aria-label={"Resumo de "+snapshot.month}>{totals.map(total=><article key={total.label} className={`${total.primary ? "is-primary" : ""}${total.primary && total.value < 0 ? " is-negative" : ""}`}><div className="finance-metric-heading"><span className={`finance-metric-icon is-${total.tone}`} aria-hidden="true"><MetricIcon name={total.label}/></span><p>{total.label}</p></div><strong className={"finance-"+total.tone}>{total.value < 0 ? "− " : ""}{money(Math.abs(total.value))}</strong><span>{total.note}</span></article>)}</section>
        <FinanceCharts snapshot={snapshot} onOpenEntries={()=>setActiveView("entries")} onOpenEntry={id=>{setSelected(id);setActiveView("entries");}}/>
      </>}
      {activeView === "entries" && <section id="finance-lancamentos" className="finance-ledger" aria-label="Lançamentos financeiros" aria-busy={loading}>
          <div className="finance-section-heading"><div><h2>Lançamentos</h2><p>Contas a pagar e a receber</p></div><div className="finance-actions">
            {snapshot.permissions.categories && <Link href="/configuracoes/financeiro">Configurações</Link>}
            {snapshot.permissions.create && <button type="button" className="finance-primary" onClick={()=>setShowForm(value=>!value)} aria-expanded={showForm}>{showForm ? "Fechar cadastro" : "+ Novo lançamento"}</button>}
          </div></div>
          {showForm && snapshot.permissions.create && <EntryForm workspace={snapshot.workspace} categories={snapshot.categories} today={snapshot.today} onSaved={()=>{setShowForm(false);saved();}} onClose={()=>setShowForm(false)}/>}
          {notice && <p role="status" className="finance-local-notice">{loading ? notice : "Alteração salva."}</p>}
          <div className="finance-tabs" aria-label="Visão dos lançamentos">{[["all","Todos","all"],["receivable","A receber","all"],["payable","A pagar","all"],["all","Vencidos","overdue"]].map(([type,label,status])=><button key={label} type="button" aria-pressed={filters.type===type && filters.status===status} onClick={()=>setFilters(current=>({...current,type,status,page:1}))}>{label}</button>)}</div>
          <form className="finance-entry-toolbar" onSubmit={event=>{event.preventDefault();setFilters(current=>({...current,query:queryDraft.trim(),page:1}));}}>
            <label className="finance-quick-search"><span aria-hidden="true">⌕</span><span className="sr-only">Buscar lançamento</span><input type="search" value={queryDraft} onChange={event=>setQueryDraft(event.target.value)} onBlur={()=>{if(queryDraft.trim()!==filters.query) setFilters(current=>({...current,query:queryDraft.trim(),page:1}));}} placeholder="Buscar lançamento..."/></label>
            <label className="finance-quick-select"><span className="sr-only">Período</span><select aria-label="Período" value={filters.month} onChange={event=>setFilters(current=>({...current,month:event.target.value,page:1}))}><option value={monthShift(filters.month,-1)}>{monthCaption(monthShift(filters.month,-1))}</option><option value={filters.month}>Período</option><option value={monthShift(filters.month,1)}>{monthCaption(monthShift(filters.month,1))}</option></select></label>
            <label className="finance-quick-select"><span className="sr-only">Categoria</span><select aria-label="Categoria" value={filters.categoryId ?? ""} onChange={event=>setFilters(current=>({...current,categoryId:event.target.value || undefined,page:1}))}><option value="">Categoria</option>{snapshot.categories.filter(category=>category.active).map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label className="finance-quick-select"><span className="sr-only">Situação</span><select aria-label="Situação" value={filters.status} onChange={event=>setFilters(current=>({...current,status:event.target.value,page:1}))}>{quickStatuses.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
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
          <div className="finance-table-scroll"><table className="finance-table"><caption className="sr-only">Contas do período. Clique na descrição para abrir os detalhes.</caption><thead><tr><th scope="col">Descrição</th><th scope="col">Categoria</th><th scope="col">Datas</th><th scope="col">Situação</th><th scope="col">Valor</th><th scope="col"><span className="sr-only">Ações</span></th></tr></thead><tbody>
            {snapshot.entries.map(entry=><tr key={entry.id} data-type={entry.type}><td><button type="button" className="finance-entry-link" aria-expanded={selected===entry.id} onClick={()=>setSelected(current=>current===entry.id ? null : entry.id)}>{entry.description}</button><small><span className="finance-entry-kind">{entry.type === "receivable" ? "A receber" : "A pagar"}</span> · {entry.type === "receivable" ? "Cliente" : "Fornecedor"}: {entry.companyName}</small><small>Lançado em {dateLabel(entry.launchDate || entry.dueDate)}</small></td><td><span className="finance-category-label">{entry.categoryName}</span></td><td className="finance-date-stack"><strong className="finance-due-date">Vence em {dateLabel(entry.dueDate)}</strong><small>{entry.settlementDate ? `${entry.type === "receivable" ? "Recebido" : "Pago"} em ${dateLabel(entry.settlementDate)}` : entry.type === "receivable" ? "Aguardando recebimento" : "Aguardando pagamento"}</small></td><td><span className={"finance-status "+(entry.cancelledAt ? "is-cancelled" : entry.paidCents===entry.amountCents ? "is-settled" : entry.dueDate<snapshot.today ? "is-overdue" : "is-open")}>{tableStatus(entry,snapshot.today)}</span></td><td className={entry.type==="receivable" ? "finance-green" : "finance-coral"}><strong>{entry.type==="receivable" ? "+ " : "− "}{money(entry.amountCents)}</strong>{entry.paidCents>0 && <small>Baixado: {money(entry.paidCents)}</small>}</td><td className="finance-table-actions"><button type="button" className="finance-action-icon" onClick={()=>setSelected(current=>current===entry.id ? null : entry.id)} aria-label={`Abrir ${entry.description}`} title="Abrir detalhes"><EditIcon/></button><button type="button" className="finance-action-icon" onClick={()=>setSelected(entry.id)} aria-label={`Mais opções de ${entry.description}`} title="Mais opções"><MoreIcon/></button></td></tr>)}
          </tbody></table></div>
          {!snapshot.entries.length && <div className="finance-empty"><h3>Nenhum lançamento encontrado</h3><p>Cadastre um lançamento ou ajuste o período e os filtros.</p></div>}
          <nav className="finance-pagination" aria-label="Páginas de lançamentos"><span className="finance-pagination-summary">{snapshot.count ? `Mostrando ${(snapshot.page-1)*pageSize+1} a ${Math.min(snapshot.page*pageSize,snapshot.count)} de ${snapshot.count} lançamentos` : "Nenhum lançamento"}</span><div className="finance-pagination-controls"><button type="button" disabled={loading || snapshot.page<=1} onClick={()=>setFilters(current=>({...current,page:snapshot.page-1}))}>Anterior</button><strong>{snapshot.page}</strong><button type="button" disabled={loading || snapshot.page*pageSize>=snapshot.count} onClick={()=>setFilters(current=>({...current,page:snapshot.page+1}))}>Próxima</button></div></nav>
          {selected && <EntryDetail key={selected} id={selected} snapshot={snapshot} onSaved={saved} onClose={()=>setSelected(null)}/>}
      </section>}
    </>}
    {showSearchResults && searchFilters && <SearchResultsDialog initialFilters={searchFilters} source={snapshot} returnFocusRef={searchPanel}
      onClose={()=>setShowSearchResults(false)} onSaved={refresh}/>}
  </div>;
}
