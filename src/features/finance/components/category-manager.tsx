"use client";
import { useState, type FormEvent } from "react";
import { saveFinanceCategory } from "../actions";
import type { FinanceCategory } from "../types";

export function CategoryManager({workspace,categories,onSaved}:{workspace:string;categories:FinanceCategory[];onSaved:()=>void}) {
  const [editing,setEditing] = useState<FinanceCategory|null>(null);
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
      else {setMessage("Categoria salva.");setEditing(null);setGeneration(n=>n+1);onSaved();}
    } catch {setMessage("Não foi possível salvar a categoria.");}
    finally {setPending(false);}
  }
  return <section className="finance-category-manager"><h3>Categorias da empresa</h3><p className="finance-form-note">Administradores podem cadastrar, renomear e inativar categorias. O histórico dos lançamentos é preservado.</p>
    <form key={(editing?.id ?? "new")+generation} onSubmit={submit}><fieldset disabled={pending} className="finance-entry-form">
      <label>Nome<input name="name" required minLength={2} maxLength={80} defaultValue={editing?.name}/></label>
      <label>Tipo<select name="kind" defaultValue={editing?.kind ?? "receivable"} disabled={Boolean(editing)}><option value="receivable">Receita</option><option value="payable">Despesa</option></select></label>
      <label className="finance-checkbox"><input name="active" type="checkbox" defaultChecked={editing?.active ?? true}/>Ativa</label>
      <div className="finance-actions"><button className="finance-primary">{pending ? "Salvando..." : editing ? "Salvar categoria" : "Criar categoria"}</button>{editing && <button type="button" onClick={()=>setEditing(null)}>Cancelar edição</button>}</div>
    </fieldset></form>
    {message && <p role="status" className="finance-local-notice">{message}</p>}
    <ul className="finance-category-list">{categories.map(category=><li key={category.id}><span>{category.name}<small>{category.kind==="receivable" ? "Receita" : "Despesa"} · {category.active ? "Ativa" : "Inativa"}</small></span><button type="button" disabled={pending} onClick={()=>{setEditing(category);setMessage("");}}>Editar</button></li>)}</ul>
  </section>;
}
