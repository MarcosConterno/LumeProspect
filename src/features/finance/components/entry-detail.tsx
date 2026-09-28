"use client";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { cancelFinanceEntry, reverseFinancePayment, settleFinanceEntry } from "../actions";
import { parseAmount } from "../data/validation";
import { loadFinanceDetailClient } from "../data/client-repository";
import { amountInput, dateLabel, entryStatus, money } from "../format";
import type { FinanceDetail, FinanceEntry, FinanceSnapshot } from "../types";
import { EntryForm } from "./entry-form";

const events:Record<string,string> = {"entry.created":"Lançamento criado","entry.updated":"Lançamento editado","entry.cancelled":"Lançamento cancelado","payment.created":"Baixa registrada","payment.reversed":"Baixa estornada"};

export function EntryDetail({id,snapshot,onSaved,onClose,initialEntry:providedEntry,initialEditing=false}:{id:string;snapshot:FinanceSnapshot;onSaved:()=>void;onClose:()=>void;initialEntry?:FinanceEntry;initialEditing?:boolean}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const closeButton=useRef<HTMLButtonElement>(null);
  const titleId=useId();
  const initialEntry=providedEntry ?? snapshot.entries.find(item=>item.id===id);
  const hasInitialEntry=Boolean(initialEntry);
  const [detail,setDetail] = useState<FinanceDetail|null>(()=>initialEntry ? {entry:initialEntry,payments:[],history:[]} : null);
  const [error,setError] = useState("");
  const [revision,setRevision] = useState(0);
  const [editing,setEditing] = useState(initialEditing);
  const requestKey=`${snapshot.workspace}:${id}:${revision}`;
  const [loadedRequest,setLoadedRequest] = useState<string|null>(null);
  const detailLoading=loadedRequest!==requestKey;
  useEffect(()=>{
    const element=dialog.current;
    const previousFocus=document.activeElement;
    const overflow=document.body.style.overflow;
    element?.showModal();
    closeButton.current?.focus();
    document.body.style.overflow="hidden";
    return ()=>{
      element?.close();
      document.body.style.overflow=overflow;
      if(previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  },[]);
  useEffect(()=>{
    let disposed=false;
    loadFinanceDetailClient(snapshot.workspace,id).then(result=>{if(disposed) return;setLoadedRequest(requestKey);if(result.error !== undefined) {if(!hasInitialEntry) setDetail(null);setError(result.error);} else {setDetail(result.data);setError("");}}).catch(()=>{if(!disposed) {setLoadedRequest(requestKey);if(!hasInitialEntry) setDetail(null);setError("Não foi possível carregar o lançamento.");}});
    return ()=>{disposed=true;};
  },[snapshot.workspace,id,requestKey,hasInitialEntry]);
  function saved() {setEditing(false);setRevision(n=>n+1);onSaved();}
  const entry=detail?.entry;
  return <dialog ref={dialog} className="finance-entry-dialog" aria-labelledby={titleId} onCancel={event=>{event.preventDefault();onClose();}} onMouseDown={event=>{if(event.target===event.currentTarget) onClose();}}>
    <section className="finance-entry-detail">
    <div className="finance-dialog-heading"><div><p>Financeiro</p><h2 id={titleId}>{editing ? "Editar lançamento" : "Detalhes do lançamento"}</h2></div><button ref={closeButton} className="finance-panel-close" type="button" aria-label={editing ? "Fechar edição" : "Fechar detalhes do lançamento"} onClick={onClose}>×</button></div>
    {error && !detailLoading && <div className="finance-entry-alert" role="alert"><p>{error}</p><button className="lume-button lume-button--outline" type="button" onClick={()=>setRevision(n=>n+1)}>Tentar novamente</button></div>}
    {!detail && (detailLoading || !error) && <p role="status" className="finance-entry-loading">Carregando lançamento...</p>}
    {detail && entry && (editing ? <div className="finance-entry-edit-view">
      <div className="finance-entry-edit-context"><p className="finance-entry-eyebrow">Editando lançamento</p><h3>{entry.description}</h3><p>{entry.companyName} · {entry.categoryName}</p><span className={`finance-entry-kind-pill ${entry.type === "receivable" ? "is-receivable" : "is-payable"}`}>{entry.type === "receivable" ? "Conta a receber" : "Conta a pagar"}</span></div>
      <div className="finance-entry-edit-form"><EntryForm workspace={snapshot.workspace} categories={snapshot.categories} today={snapshot.today} entry={entry} onSaved={saved} onClose={()=>setEditing(false)}/></div>
    </div> : <>
      <div className="finance-entry-overview">
        <div className="finance-entry-title-row"><div><p className="finance-entry-eyebrow">{entry.companyName}</p><h3>{entry.description}</h3><p className="finance-entry-category">{entry.categoryName}</p></div><div className="finance-entry-title-actions"><span className={`finance-entry-kind-pill ${entry.type === "receivable" ? "is-receivable" : "is-payable"}`}>{entry.type === "receivable" ? "Conta a receber" : "Conta a pagar"}</span>{snapshot.permissions.update && !entry.cancelledAt && <button type="button" className="finance-entry-edit-button" onClick={()=>setEditing(true)}>Editar lançamento</button>}</div></div>
        <div className="finance-entry-meta"><span><b>Status</b>{entryStatus(entry,snapshot.today)}</span><span><b>Lançado em</b>{dateLabel(entry.launchDate || entry.dueDate)}</span><span><b>Vence em</b>{dateLabel(entry.dueDate)}</span><span><b>{entry.settlementDate ? entry.type === "receivable" ? "Recebido em" : "Pago em" : "Realização"}</b>{entry.settlementDate ? dateLabel(entry.settlementDate) : "Ainda pendente"}</span></div>
        <div className="finance-entry-amounts"><article><span>Total</span><strong>{money(entry.amountCents)}</strong></article><article><span>Baixado</span><strong className="finance-green">{money(entry.paidCents)}</strong></article><article className="is-highlight"><span>Em aberto</span><strong>{money(entry.cancelledAt ? 0 : entry.amountCents-entry.paidCents)}</strong></article></div>
        {entry.notes && <div className="finance-entry-note"><span>Observações</span><p className="finance-notes">{entry.notes}</p></div>}
        {entry.cancelledAt && <div className="finance-entry-cancelled"><strong>Lançamento cancelado</strong><span>{entry.cancelReason}</span></div>}
      </div>
      <section className="finance-entry-section"><div className="finance-entry-section-heading"><div><p>Movimentação</p><h3>Pagamentos e recebimentos</h3></div><span>{detailLoading ? "Atualizando..." : `${detail.payments.length} registro${detail.payments.length === 1 ? "" : "s"}`}</span></div>
        {!entry.cancelledAt && entry.paidCents<entry.amountCents && snapshot.permissions.settle && <PaymentForm key={entry.id+":"+entry.version} detail={detail} snapshot={snapshot} onSaved={saved}/>}
        {detailLoading && <p className="finance-entry-empty">Carregando movimentações...</p>}
        {!detailLoading && !detail.payments.length && <p className="finance-entry-empty">Nenhuma baixa registrada.</p>}
        <ul className="finance-payment-list">{detail.payments.map(payment=><li key={payment.id}>
          <div className="finance-payment-heading"><strong>{money(payment.amountCents)}</strong><span>{dateLabel(payment.paidOn)}</span></div><p className="finance-payment-actor">{payment.actor}</p>
          {payment.notes && <p className="finance-notes finance-payment-note">{payment.notes}</p>}
          {payment.reversedAt
            ? <p className="finance-payment-reversed">Estornado: {payment.reverseReason}</p>
            : snapshot.permissions.reverse && (
              <ReasonForm
                key={payment.id+":"+entry.version}
                label="Estornar baixa"
                perform={reason=>reverseFinancePayment(snapshot.workspace,{id:payment.id,entryId:entry.id,version:entry.version,reason})}
                onSaved={saved}
              />
            )}
        </li>)}</ul>
        {!entry.cancelledAt && entry.paidCents===0 && snapshot.permissions.cancel && <div className="finance-entry-danger"><ReasonForm key={"cancel:"+entry.version} label="Cancelar lançamento" perform={reason=>cancelFinanceEntry(snapshot.workspace,{id:entry.id,version:entry.version,reason})} onSaved={saved}/></div>}
      </section>
      <details className="finance-entry-history"><summary>Histórico do lançamento <span>últimos 100 eventos</span></summary><ol className="finance-history">{detail.history.map(item=><li key={item.id}><strong>{events[item.event] ?? item.event}</strong><p>{new Date(item.createdAt).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})} · {item.actor}</p>{item.details && typeof item.details==="object" && !Array.isArray(item.details) && typeof item.details.reason==="string" && <p>{item.details.reason}</p>}</li>)}</ol></details>
    </>)}
    </section>
  </dialog>;
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
  return <details><summary className="finance-text-button finance-settle-trigger">{entry.type==="receivable" ? "Registrar recebimento" : "Registrar pagamento"}</summary><form onSubmit={submit}><fieldset disabled={pending} className="finance-entry-form">
    <p className="finance-form-note">Registre o valor efetivamente realizado. São permitidas baixas parciais.</p>
    <label>Valor (R$)<input name="amount" required inputMode="decimal" defaultValue={amountInput(entry.amountCents-entry.paidCents)}/></label>
    <label>{entry.type === "receivable" ? "Data de recebimento" : "Data de pagamento"}<input name="date" required type="date" min="1900-01-01" max={snapshot.today} defaultValue={snapshot.today}/></label>
    <label className="finance-wide">Observações<input name="notes" maxLength={1000}/></label>
    {error && <p role="alert" className="finance-wide finance-coral">{error}</p>}<button className="finance-primary lume-button--success">{pending ? "Salvando..." : "Confirmar baixa"}</button>
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
  return <details><summary className="finance-text-button finance-danger-trigger">{label}</summary><form onSubmit={submit}><fieldset disabled={pending} className="finance-entry-form"><label className="finance-wide">Motivo obrigatório<input name="reason" required minLength={3} maxLength={500}/></label><p className="finance-form-note">Esta operação altera os totais e fica registrada no histórico.</p>{error && <p role="alert" className="finance-wide finance-coral">{error}</p>}<button className="finance-primary lume-button--danger">{pending ? "Salvando..." : "Confirmar: "+label.toLowerCase()}</button></fieldset></form></details>;
}
