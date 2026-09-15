"use client";
import { useEffect, useId, useState } from "react";
import { findFinanceCompanies } from "../actions";
import type { CompanyChoice } from "../types";

export function CompanySearch({workspace,value,onChange,disabled}:{workspace:string;value:CompanyChoice|null;onChange:(value:CompanyChoice|null)=>void;disabled:boolean}) {
  const id = useId();
  const [query,setQuery] = useState(value?.name ?? "");
  const [results,setResults] = useState<CompanyChoice[]>([]);
  const [message,setMessage] = useState("");
  const [open,setOpen] = useState(false);
  const [active,setActive] = useState(-1);
  useEffect(() => {
    let disposed = false;
    if(value || query.trim().length < 2 || !open) return;
    const timer = setTimeout(async () => {
      setMessage("Buscando...");
      try {
        const result = await findFinanceCompanies(workspace,query);
        if(disposed) return;
        if(result.error !== undefined) {setResults([]); setMessage(result.error);}
        else {setResults(result.data); setMessage(result.data.length ? "Selecione o cadastro." : "Nenhum cadastro ativo encontrado.");}
      } catch {if(!disposed) setMessage("Não foi possível buscar. Tente novamente.");}
    },300);
    return () => {disposed=true; clearTimeout(timer);};
  },[workspace,query,value,open]);
  function choose(company:CompanyChoice) {onChange(company);setQuery(company.name);setOpen(false);setActive(-1);}
  return <div className="finance-company-search">
    <label htmlFor={id}>Pessoa / empresa</label>
    <input id={id} role="combobox" aria-autocomplete="list" aria-expanded={open && !value && results.length>0} aria-controls={id+"-options"} aria-activedescendant={active>=0 ? id+"-option-"+active : undefined}
      disabled={disabled} required value={query} maxLength={100} autoComplete="off" placeholder="Digite o nome do cadastro"
      onFocus={()=>setOpen(true)} onChange={event=>{setQuery(event.target.value);onChange(null);setResults([]);setActive(-1);setOpen(true);setMessage("");}}
      onKeyDown={event=>{if(event.key==="Escape") {setOpen(false);setActive(-1);} if(event.key==="ArrowDown" && results.length) {event.preventDefault();setActive(n=>Math.min(n+1,results.length-1));} if(event.key==="ArrowUp") {event.preventDefault();setActive(n=>Math.max(0,n-1));} if(event.key==="Enter" && open && active>=0 && results[active]) {event.preventDefault();choose(results[active]);}}}/>
    {open && !value && <><ul id={id+"-options"} role="listbox" aria-label="Cadastros encontrados">{results.map((company,index)=><li id={id+"-option-"+index} key={company.id} role="option" aria-selected={active===index}><button type="button" onClick={()=>choose(company)}>{company.name}</button></li>)}</ul><small role="status">{query.trim().length<2 ? "Digite pelo menos 2 caracteres." : message}</small></>}
    {value && <small>Cadastro vinculado.</small>}
  </div>;
}
