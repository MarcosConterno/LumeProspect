"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import type { FinanceCategory } from "../types";

function searchable(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR");
}

export function CategorySelect({categories,value,onChange,name,allowAll=false,disabled=false,required=false}:{
  categories:FinanceCategory[];value:string;onChange:(value:string)=>void;
  name?:string;allowAll?:boolean;disabled?:boolean;required?:boolean;
}) {
  const id=useId();
  const list=useRef<HTMLUListElement>(null);
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState("");
  const [active,setActive]=useState(-1);
  const options=[
    ...(allowAll ? [{id:"",label:"Todas as categorias"}] : []),
    ...categories.map(category=>({id:category.id,label:category.name+" · "+(category.kind==="receivable" ? "Receita" : "Despesa")+(category.active ? "" : " (inativa)")})),
  ];
  const selected=options.find(option=>option.id===value);
  const matches=options.filter(option=>searchable(option.label).includes(searchable(query.trim())));
  const expanded=open && !disabled;

  function show() {setOpen(true);setQuery("");setActive(-1);}
  function close() {setOpen(false);setQuery("");setActive(-1);}
  function choose(id:string) {onChange(id);close();}
  function keyDown(event:KeyboardEvent<HTMLInputElement>) {
    if(event.key==="Escape") {event.preventDefault();event.stopPropagation();close();return;}
    if(event.key==="ArrowDown" || event.key==="ArrowUp") {
      event.preventDefault();
      if(!expanded) {show();return;}
      if(!matches.length) return;
      const next=event.key==="ArrowDown" ? Math.min(active+1,matches.length-1) : active<0 ? matches.length-1 : Math.max(0,active-1);
      setActive(next);
      list.current?.children.item(next)?.scrollIntoView({block:"nearest"});
    }
    if(event.key==="Enter" && expanded) {
      event.preventDefault();
      if(matches[active]) choose(matches[active].id);
      else if(matches.length===1) choose(matches[0].id);
    }
  }

  return <div className="finance-category-select" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget)) close();}}>
    <label htmlFor={id}>Categoria</label>
    {name && <input type="hidden" name={name} value={value} disabled={disabled}/>}
    <div className="finance-category-input">
      <input id={id} role="combobox" aria-autocomplete="list" aria-expanded={expanded}
        aria-controls={expanded ? id+"-options" : undefined}
        aria-activedescendant={expanded && matches[active] ? id+"-option-"+active : undefined}
        disabled={disabled} required={required && !value} autoComplete="off" maxLength={100}
        value={expanded ? query : selected?.label ?? ""} placeholder={expanded ? "Digite para buscar..." : "Selecione uma categoria"}
        onFocus={show} onClick={()=>{if(!expanded) show();}}
        onChange={event=>{setQuery(event.target.value);setActive(-1);setOpen(true);}} onKeyDown={keyDown}/>
      <span aria-hidden="true">⌄</span>
    </div>
    {expanded && <div className="finance-category-popup">
      <ul id={id+"-options"} ref={list} role="listbox" aria-label="Categorias">
        {matches.map((option,index)=><li key={option.id} id={id+"-option-"+index} role="option" tabIndex={-1}
          aria-selected={value===option.id} data-active={active===index}
          onKeyDown={event=>{if(event.key==="Enter" || event.key===" ") {event.preventDefault();choose(option.id);}}}
          onMouseDown={event=>event.preventDefault()} onClick={()=>choose(option.id)}>{option.label}</li>)}
      </ul>
      {!matches.length && <p role="status">Nenhuma categoria encontrada.</p>}
    </div>}
  </div>;
}
