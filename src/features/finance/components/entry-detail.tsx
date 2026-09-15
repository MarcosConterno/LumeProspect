"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { cancelFinanceEntry, readFinanceEntry, reverseFinancePayment, settleFinanceEntry } from "../actions";
import { parseAmount } from "../data/validation";
import { amountInput, dateLabel, entryStatus, money } from "../format";
import type { FinanceDetail, FinanceSnapshot } from "../types";
import { EntryForm } from "./entry-form";

const events:Record<string,string> = {"entry.created":"Lançamento criado","entry.updated":"Lançamento editado","entry.cancelled":"Lançamento cancelado","payment.created":"Baixa registrada","payment.reversed":"Baixa estornada"};

export function EntryDetail({id,snapshot,onSaved,onClose}:{id:string;snapshot:FinanceSnapshot;onSaved:()=>void;onClose:()=>void}) {
  const [detail,setDetail] = useState<FinanceDetail|null>(null);
  const [error,setError] = useState("");
  const [revision,setRevision] = useState(0);
  const [editing,setEditing] = useState(false);
  useEffect(()=>{
    let disposed=false;
    readFinanceEntry(snapshot.workspace,id).then(result=>{if(disposed) return;if(result.error !== undefined) {setDetail(null);setError(result.error);} else {setDetail(result.data);setError("");}}).catch(()=>{if(!disposed) {setDetail(null);setError("Não foi possível carregar o lançamento.");}});
    return ()=>{disposed=true;};
  },[snapshot,id,revision]);
  function saved() {setEditing(false);setRevision(n=>n+1);onSaved();}
  const entry=detail?.entry;
  return <section className="finance-entry-detail" aria-label="Detalhes do lançamento">
    <div className="finance-section-heading"><h3>Detalhes do lançamento</h3><button type="button" onClick={onClose}>Fechar</button></div>
    {error && <p role="alert">{error} <button type="button" onClick={()=>setRevision(n=>n+1)}>Tentar novamente</button></p>}
    {!detail && !error && <p role="status">Carregando...</p>}
    {detail && entry && <>
      <h3>{entry.description}</h3><p>{entry.companyName} · {entry.categoryName}</p>
      <p>{entry.type==="receivable" ? "Conta a receber" : "Conta a pagar"} · {entryStatus(entry,snapshot.today)} · vence em {dateLabel(entry.dueDate)}</p>
      <p>Total: <strong>{money(entry.amountCents)}</strong> · Baixado: <strong>{money(entry.paidCents)}</strong> · Em aberto: <strong>{money(entry.cancelledAt ? 0 : entry.amountCents-entry.paidCents)}</strong></p>
      {entry.notes && <p className="finance-notes">{entry.notes}</p>}
      {entry.cancelledAt && <p>Cancelamento: {entry.cancelReason}</p>}
      {snapshot.permissions.update && !entry.cancelledAt && <button type="button" className="finance-text-button" onClick={()=>setEditing(value=>!value)}>{editing ? "Fechar edição" : "Editar lançamento"}</button>}
      {editing && <EntryForm workspace={snapshot.workspace} categories={snapshot.categories} today={snapshot.today} entry={entry} onSaved={saved} onClose={()=>setEditing(false)}/>}
      {!entry.cancelledAt && entry.paidCents<entry.amountCents && snapshot.permissions.settle && <PaymentForm key={entry.id+":"+entry.version} detail={detail} snapshot={snapshot} onSaved={saved}/>}
      <h3>Pagamentos e recebimentos</h3>
      {!detail.payments.length && <p>Nenhuma baixa registrada.</p>}
      <ul className="finance-history">{detail.payments.map(payment=><li key={payment.id}>
        <p><strong>{money(payment.amountCents)}</strong> · {dateLabel(payment.paidOn)} · {payment.actor}</p>
        {payment.notes && <p className="finance-notes">{payment.notes}</p>}
        {payment.reversedAt ? <p>Estornado: {payment.reverseReason}</p> : snapshot.permissions.reverse && <ReasonForm key={payment.id+":"+entry.version} label="Estornar baixa" perform={reason=>reverseFinancePayment(snapshot.workspace,{id:payment.id,entryId:entry.id,version:entry.version,reason})} onSaved={saved}/>}
      </li>)}</ul>
      {!entry.cancelledAt && entry.paidCents===0 && snapshot.permissions.cancel && <ReasonForm key={"cancel:"+entry.version} label="Cancelar lançamento" perform={reason=>cancelFinanceEntry(snapshot.workspace,{id:entry.id,version:entry.version,reason})} onSaved={saved}/>}
      <details className="finance-chart-data"><summary>Histórico do lançamento (últimos 100 eventos)</summary><ol className="finance-history">{detail.history.map(item=><li key={item.id}><strong>{events[item.event] ?? item.event}</strong><p>{new Date(item.createdAt).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})} · {item.actor}</p>{item.details && typeof item.details==="object" && !Array.isArray(item.details) && typeof item.details.reason==="string" && <p>{item.details.reason}</p>}</li>)}</ol></details>
    </>}
  </section>;
}

function PaymentForm({detail,snapshot,onSaved}:{detail:FinanceDetail;snapshot:FinanceSnapshot;onSaved:()=>void}) {
  const [pending,setPending]=useState(false);
  const [error,setError]=useState("");
  const request=useRef("");
  const entry=detail.entry;
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(pending) return;
    const form=new FormData(event.currentTarget);
    setPending(true);setError("");
    try {
      request.current ||= crypto.randomUUID();
      const result=await settleFinanceEntry(snapshot.workspace,{id:request.current,entryId:entry.id,version:entry.version,amountCents:parseAmount(String(form.get("amount"))),paidOn:String(form.get("date")),notes:String(form.get("notes"))});
      if(result.error !== undefined) setError(result.error); else onSaved();
    } catch(error) {setError(error instanceof Error ? error.message : "Não foi possível registrar a baixa.");}
    finally {setPending(false);}
  }
  return <details><summary className="finance-text-button">{entry.type==="receivable" ? "Registrar recebimento" : "Registrar pagamento"}</summary><form onSubmit={submit}><fieldset disabled={pending} className="finance-entry-form">
    <p className="finance-form-note">Registre o valor efetivamente realizado. São permitidas baixas parciais.</p>
    <label>Valor (R$)<input name="amount" required inputMode="decimal" defaultValue={amountInput(entry.amountCents-entry.paidCents)}/></label>
    <label>Data da baixa<input name="date" required type="date" min="1900-01-01" max={snapshot.today} defaultValue={snapshot.today}/></label>
    <label className="finance-wide">Observações<input name="notes" maxLength={1000}/></label>
    {error && <p role="alert" className="finance-wide finance-coral">{error}</p>}<button className="finance-primary">{pending ? "Salvando..." : "Confirmar baixa"}</button>
  </fieldset></form></details>;
}

function ReasonForm({label,perform,onSaved}:{label:string;perform:(reason:string)=>Promise<{error?:string}>;onSaved:()=>void}) {
  const [pending,setPending]=useState(false);
  const [error,setError]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(pending) return;
    const reason=String(new FormData(event.currentTarget).get("reason"));
    setPending(true);setError("");
    try {const result=await perform(reason);if(result.error !== undefined) setError(result.error);else onSaved();}
    catch {setError("Não foi possível concluir a operação.");} finally {setPending(false);}
  }
  return <details><summary className="finance-text-button">{label}</summary><form onSubmit={submit}><fieldset disabled={pending} className="finance-entry-form"><label className="finance-wide">Motivo obrigatório<input name="reason" required minLength={3} maxLength={500}/></label><p className="finance-form-note">Esta operação altera os totais e fica registrada no histórico.</p>{error && <p role="alert" className="finance-wide finance-coral">{error}</p>}<button className="finance-primary">{pending ? "Salvando..." : "Confirmar: "+label.toLowerCase()}</button></fieldset></form></details>;
}
