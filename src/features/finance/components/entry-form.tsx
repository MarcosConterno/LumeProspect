"use client";
import { useRef, useState, type FormEvent } from "react";
import { saveFinanceEntry } from "../actions";
import { parseMaskedAmount } from "../data/validation";
import { currencyMask, money } from "../format";
import type { CompanyChoice, FinanceCategory, FinanceEntry, FinanceKind } from "../types";
import { CompanySearch } from "./company-search";
import { CategorySelect } from "./category-select";

export function EntryForm({workspace,categories,today,entry,onSaved,onClose}:{workspace:string;categories:FinanceCategory[];today:string;entry?:FinanceEntry;onSaved:()=>void;onClose:()=>void}) {
  const [kind,setKind] = useState<FinanceKind>(entry?.type ?? "receivable");
  const [company,setCompany] = useState<CompanyChoice|null>(entry ? {id:entry.companyId,name:entry.companyName} : null);
  const [category,setCategory] = useState(entry?.categoryId ?? "");
  const [launchDate,setLaunchDate] = useState(entry?.launchDate ?? today);
  const [amount,setAmount] = useState(entry ? money(entry.amountCents) : "");
  const [pending,setPending] = useState(false);
  const [error,setError] = useState("");
  const requestId = useRef(entry?.id ?? "");
  const [original] = useState(entry);
  const locked = Boolean(original?.hasPayments);
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(pending) return;
    const form = new FormData(event.currentTarget);
    setError("");setPending(true);
    try {
      if(!company) throw new Error("Selecione uma pessoa ou empresa nos resultados da busca.");
      if(!category) throw new Error("Selecione uma categoria na lista.");
      requestId.current ||= crypto.randomUUID();
      const result = await saveFinanceEntry(workspace,{id:requestId.current,version:original?.version,type:kind,companyId:company.id,categoryId:category,
        description:String(form.get("description")),launchDate:String(form.get("launchDate")),dueDate:String(form.get("date")),amountCents:locked ? original!.amountCents : parseMaskedAmount(amount),notes:String(form.get("notes"))});
      if(result.error !== undefined) setError(result.error); else onSaved();
    } catch(error) {setError(error instanceof Error ? error.message : "Não foi possível salvar.");}
    finally {setPending(false);}
  }
  return <form onSubmit={submit}><fieldset disabled={pending} className="finance-entry-form">
    <h3 className="finance-wide">{original ? "Editar lançamento" : "Novo lançamento"}</h3>
    {locked && <p className="finance-form-note">O histórico de baixas preserva tipo, pessoa/empresa, categoria e valor.</p>}
    <label>Tipo<select value={kind} disabled={locked} onChange={e=>{setKind(e.target.value as FinanceKind);setCategory("");}}><option value="receivable">Conta a receber</option><option value="payable">Conta a pagar</option></select></label>
    <label>Data de lançamento<input type="date" name="launchDate" required min="1900-01-01" max="2100-12-31" value={launchDate} onChange={event=>setLaunchDate(event.target.value)}/></label>
    <label>Vencimento<input type="date" name="date" required min="1900-01-01" max="2100-12-31" defaultValue={original?.dueDate ?? today}/></label>
    <label className="finance-wide">Descrição<input name="description" required minLength={2} maxLength={160} defaultValue={original?.description}/></label>
    <CompanySearch workspace={workspace} value={company} onChange={setCompany} disabled={locked}/>
    <CategorySelect key={kind} required disabled={locked || pending} value={category} onChange={setCategory}
      categories={categories.filter(c=>c.kind===kind && (c.active || c.id===original?.categoryId))}/>
    <label>Valor (R$)<input name="amount" inputMode="numeric" required disabled={locked} value={locked ? money(original!.amountCents) : amount} onChange={event=>setAmount(currencyMask(event.target.value))} placeholder="R$ 0,00"/></label>
    <label className="finance-wide">Observações<textarea name="notes" maxLength={4000} rows={3} defaultValue={original?.notes}/></label>
    {error && <p role="alert" className="finance-wide finance-coral">{error}</p>}
    <div className="finance-actions finance-wide"><button className="finance-primary" disabled={pending}>{pending ? "Salvando..." : "Salvar lançamento"}</button><button type="button" className="lume-button lume-button--ghost" onClick={onClose}>Fechar</button></div>
  </fieldset></form>;
}
