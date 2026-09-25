"use client";
import { useState, type FormEvent } from "react";
import { saveFinanceCategory } from "../actions";
import type { FinanceCategory } from "../types";

export function CategoryManager({workspace,categories,onSaved}:{workspace:string;categories:FinanceCategory[];onSaved:()=>void}) {
  const [editing,setEditing] = useState<FinanceCategory|null>(null);
  const [formOpen,setFormOpen] = useState(false);
  const [generation,setGeneration] = useState(0);
  const [pending,setPending] = useState(false);
  const [message,setMessage] = useState("");
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(pending) return;
    const form = new FormData(event.currentTarget);
    setPending(true);setMessage("");
    try {
      const result = await saveFinanceCategory(workspace,{id:editing?.id ?? crypto.randomUUID(),version:editing?.version,name:String(form.get("name")),kind:editing?.kind ?? (form.get("kind")==="payable" ? "payable" : "receivable"),active:form.get("active")==="on"});
      if(result.error !== undefined) setMessage(result.error);
      else {setMessage("Categoria salva.");setEditing(null);setFormOpen(false);setGeneration(n=>n+1);onSaved();}
    } catch {setMessage("Não foi possível salvar a categoria.");}
    finally {setPending(false);}
  }
  const receipts = categories.filter(category=>category.kind==="receivable");
  const expenses = categories.filter(category=>category.kind==="payable");
  return <section className="finance-category-manager rounded-xl border border-border bg-surface p-5"><header className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="font-display text-xl">Categorias financeiras</h3><p className="finance-form-note mt-2">Organize receitas e despesas da empresa. Alterar uma categoria não modifica o histórico dos lançamentos.</p></div><button type="button" className="finance-primary" onClick={()=>{setEditing(null);setMessage("");setFormOpen(true);}}>Nova categoria</button></header>
    {formOpen && <form key={(editing?.id ?? "new")+generation} onSubmit={submit} className="mt-5"><fieldset disabled={pending} className="finance-entry-form">
      <legend className="finance-wide font-medium">{editing ? "Editar categoria" : "Nova categoria"}</legend>
      <label>Nome<input name="name" required minLength={2} maxLength={80} defaultValue={editing?.name}/></label>
      <label>Tipo<select name="kind" defaultValue={editing?.kind ?? "receivable"} disabled={Boolean(editing)}><option value="receivable">Receita</option><option value="payable">Despesa</option></select></label>
      <label className="finance-checkbox"><input name="active" type="checkbox" defaultChecked={editing?.active ?? true}/>Ativa</label>
      <div className="finance-actions finance-wide"><button className="finance-primary">{pending ? "Salvando..." : editing ? "Salvar categoria" : "Criar categoria"}</button><button type="button" onClick={()=>{setEditing(null);setFormOpen(false);}}>Cancelar</button></div>
    </fieldset></form>}
    {message && <p role="status" className="finance-local-notice mt-4">{message}</p>}
    <div className="mt-6 grid gap-4 lg:grid-cols-2"><CategoryGroup title="Receitas" kind="receivable" categories={receipts} pending={pending} onEdit={category=>{setEditing(category);setMessage("");setFormOpen(true);}}/><CategoryGroup title="Despesas" kind="payable" categories={expenses} pending={pending} onEdit={category=>{setEditing(category);setMessage("");setFormOpen(true);}}/></div>
  </section>;
}

function CategoryGroup({title,kind,categories,pending,onEdit}:{title:string;kind:FinanceCategory["kind"];categories:FinanceCategory[];pending:boolean;onEdit:(category:FinanceCategory)=>void}) {
  return <section className="finance-category-group" aria-labelledby={`category-group-${kind}`}><div className="flex items-center justify-between gap-3"><div><h4 id={`category-group-${kind}`} className="font-medium">{title}</h4><p className="text-xs text-[var(--ink-soft)]">{categories.filter(category=>category.active).length} ativas · {categories.length} no total</p></div><span className={`finance-kind-badge ${kind}`}>{kind === "receivable" ? "Entrada" : "Saída"}</span></div>{categories.length ? <ul className="finance-category-list">{categories.map(category=><li key={category.id}><div className="min-w-0"><span className="block truncate font-medium">{category.name}</span><small className={category.active ? "finance-status-active" : "finance-status-inactive"}>{category.active ? "Ativa" : "Inativa"}</small></div><button type="button" disabled={pending} onClick={()=>onEdit(category)} className="finance-text-button">Editar</button></li>)}</ul> : <p className="mt-4 rounded-lg border border-dashed border-border p-4 text-xs text-[var(--ink-soft)]">Nenhuma categoria cadastrada.</p>}</section>;
}
