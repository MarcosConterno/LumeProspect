"use client";

import { useEffect, useId, useRef } from "react";
import type { FinanceCategory, FinanceKind } from "../types";
import { EntryForm } from "./entry-form";

export function EntryCreatePanel({workspace,categories,today,kind,kindLocked,onSaved,onClose}:{workspace:string;categories:FinanceCategory[];today:string;kind:FinanceKind;kindLocked:boolean;onSaved:()=>void;onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const closeButton=useRef<HTMLButtonElement>(null);
  const titleId=useId();
  const kindLabel=kindLocked ? kind === "receivable" ? "Entrada financeira" : "Saída financeira" : "Escolha o tipo do lançamento";

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

  return <dialog ref={dialog} className="finance-entry-dialog finance-create-dialog" aria-labelledby={titleId} onCancel={event=>{event.preventDefault();onClose();}} onMouseDown={event=>{if(event.target===event.currentTarget) onClose();}}>
    <section className="finance-entry-detail finance-create-detail">
      <div className="finance-dialog-heading"><div><p>Financeiro</p><h2 id={titleId}>Novo lançamento</h2><span>{kindLabel}</span></div><button ref={closeButton} className="finance-panel-close" type="button" aria-label="Fechar novo lançamento" onClick={onClose}>×</button></div>
      <div className="finance-entry-form-wrap"><EntryForm workspace={workspace} categories={categories} today={today} initialKind={kind} kindLocked={kindLocked} onSaved={onSaved} onClose={onClose}/></div>
    </section>
  </dialog>;
}
