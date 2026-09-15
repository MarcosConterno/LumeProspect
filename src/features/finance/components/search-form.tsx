"use client";

import { useState, type FormEvent } from "react";
import { parseAmount, validateFilters } from "../data/validation";
import { amountInput } from "../format";
import { financeStatuses } from "../search";
import type { FinanceCategory, FinanceFilters } from "../types";
import { CategorySelect } from "./category-select";

type Period = "day" | "month" | "year" | "range";

function initialPeriod(filters:FinanceFilters):Period {
  if(!filters.dateFrom || !filters.dateTo) return "month";
  if(filters.dateFrom===filters.dateTo) return "day";
  if(filters.dateFrom.slice(0,4)===filters.dateTo.slice(0,4) && filters.dateFrom.endsWith("-01-01") && filters.dateTo.endsWith("-12-31")) return "year";
  const month=validateFilters({...filters,month:filters.dateFrom.slice(0,7),dateFrom:undefined,dateTo:undefined});
  return filters.dateFrom===month.dateFrom && filters.dateTo===month.dateTo ? "month" : "range";
}

export function FinanceSearchForm({filters,categories,onApply,onClear}:{
  filters:FinanceFilters;categories:FinanceCategory[];onApply:(filters:FinanceFilters)=>void;onClear:()=>void;
}) {
  const [period,setPeriod]=useState<Period>(()=>initialPeriod(filters));
  const [error,setError]=useState("");
  const [category,setCategory]=useState(filters.categoryId ?? "");
  const [type,setType]=useState(filters.type);

  function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    const value=(name:string)=>String(form.get(name) ?? "").trim();
    try {
      let dateFrom:string;
      let dateTo:string;
      if(period==="day") dateFrom=dateTo=value("day");
      else if(period==="year") {dateFrom=value("year")+"-01-01";dateTo=value("year")+"-12-31";}
      else if(period==="month") {
        const checked=validateFilters({...filters,month:value("searchMonth"),dateFrom:undefined,dateTo:undefined});
        dateFrom=checked.dateFrom!;dateTo=checked.dateTo!;
      } else {dateFrom=value("from");dateTo=value("to");}
      if(!dateFrom || !dateTo) throw new Error("Preencha o período da busca.");
      const checked=validateFilters({...filters,type,page:1,dateFrom,dateTo,query:value("query"),status:value("status"),
        companyQuery:value("company"),categoryId:value("category"),
        minAmountCents:value("minimum") ? parseAmount(value("minimum")) : undefined,
        maxAmountCents:value("maximum") ? parseAmount(value("maximum")) : undefined});
      setError("");onApply(checked);
    } catch(error) {setError(error instanceof Error ? error.message : "Confira os filtros.");}
  }

  return <form className="finance-search-panel" onSubmit={submit}>
    <div className="finance-section-heading"><h3>Buscar lançamentos</h3><span>Filtros combináveis</span></div>
    <div className="finance-search-grid">
      <label>Tipo de lançamento<select value={type} onChange={event=>{
        const next=event.target.value;
        setType(next);
        if(next!=="all" && categories.find(item=>item.id===category)?.kind!==next) setCategory("");
      }}>
        <option value="all">Todos</option><option value="receivable">A receber</option><option value="payable">A pagar</option>
      </select></label>
      <label>Período por vencimento<select value={period} onChange={event=>setPeriod(event.target.value as Period)}>
        <option value="day">Dia</option><option value="month">Mês</option><option value="year">Ano</option><option value="range">Intervalo de datas</option>
      </select></label>
      {period==="day" && <label>Dia<input name="day" type="date" required min="1900-01-01" max="2100-12-31" defaultValue={filters.dateFrom ?? filters.month+"-01"}/></label>}
      {period==="month" && <label>Mês<input name="searchMonth" type="month" required min="1900-01" max="2100-12" defaultValue={filters.dateFrom?.slice(0,7) ?? filters.month}/></label>}
      {period==="year" && <label>Ano<input name="year" type="number" required min={1900} max={2100} step={1} defaultValue={filters.dateFrom?.slice(0,4) ?? filters.month.slice(0,4)}/></label>}
      {period==="range" && <>
        <label>De<input name="from" type="date" required min="1900-01-01" max="2100-12-31" defaultValue={filters.dateFrom ?? filters.month+"-01"}/></label>
        <label>Até<input name="to" type="date" required min="1900-01-01" max="2100-12-31" defaultValue={filters.dateTo ?? filters.month+"-01"}/></label>
      </>}
      <label>Cliente / fornecedor<input name="company" type="search" maxLength={160} defaultValue={filters.companyQuery} placeholder="Nome ou parte do nome"/></label>
      <CategorySelect name="category" value={category} onChange={setCategory} allowAll
        categories={categories.filter(item=>type==="all" || item.kind===type)}/>
      <label>Valor mínimo (R$)<input name="minimum" inputMode="decimal" defaultValue={filters.minAmountCents === undefined ? "" : amountInput(filters.minAmountCents)} placeholder="Sem mínimo"/></label>
      <label>Valor máximo (R$)<input name="maximum" inputMode="decimal" defaultValue={filters.maxAmountCents === undefined ? "" : amountInput(filters.maxAmountCents)} placeholder="Sem máximo"/></label>
      <label>Situação<select name="status" defaultValue={filters.status}>{financeStatuses.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label className="finance-wide">Descrição ou palavra-chave<input name="query" type="search" maxLength={150} defaultValue={filters.query} placeholder="Descrição, cliente ou categoria"/></label>
    </div>
    <p className="finance-form-note">Para um valor exato, use o mesmo mínimo e máximo. Valores sem separador de milhar. A busca considera o valor total do lançamento.</p>
    {error && <p role="alert" className="finance-coral">{error}</p>}
    <div className="finance-actions">
      <button className="finance-primary" type="submit">Buscar</button>
      <button type="button" onClick={onClear}>Limpar filtros</button>
    </div>
  </form>;
}
