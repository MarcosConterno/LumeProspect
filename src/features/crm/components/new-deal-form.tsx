"use client";

import { useMemo, useState, type FormEvent } from "react";
import { dealStages } from "@/features/crm/constants";
import type { CrmOptions, DealInput } from "@/features/crm/types";

function defaultCloseDate() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
}

export function NewDealForm({
  options,
  pending,
  onSubmit,
  onCancel,
}: {
  options: CrmOptions;
  pending: boolean;
  onSubmit: (input: DealInput) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [companyId, setCompanyId] = useState(options.companies[0]?.id ?? "");
  const contacts = useMemo(
    () => options.contacts.filter((contact) => contact.company_id === companyId),
    [companyId, options.contacts],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const selectedCompany = options.companies.find((company) => company.id === companyId);
    const service = options.services.find((item) => item.id === data.get("serviceId"));
    const name = String(data.get("name") ?? "").trim() || `${selectedCompany?.name ?? "Novo negócio"}${service ? ` · ${service.name}` : ""}`;
    if (!companyId) return;

    onSubmit({
      name,
      companyId,
      contactId: String(data.get("contactId") ?? ""),
      serviceId: String(data.get("serviceId") ?? ""),
      ownerId: String(data.get("ownerId") ?? ""),
      value: Number(data.get("value") ?? 0),
      stage: String(data.get("stage") ?? "new") as DealInput["stage"],
      expectedCloseDate: String(data.get("expectedCloseDate") ?? ""),
      summary: String(data.get("summary") ?? ""),
      status: "open",
      lostReason: "",
    });
  }

  return (
    <form onSubmit={submit} className="fixed inset-x-4 bottom-4 z-50 max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto overscroll-contain rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-2xl sm:left-auto sm:right-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl">Novo negócio</h2>
          <p className="mt-1 text-xs text-[var(--ink-soft)]">Vincule o negócio aos cadastros reais do CRM.</p>
        </div>
        <button type="button" onClick={onCancel} aria-label="Fechar formulário" className="lume-button lume-button--icon lume-button--ghost">×</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-[var(--ink-soft)] sm:col-span-2">
          Empresa atendida
          <select name="companyId" required value={companyId} onChange={(event) => setCompanyId(event.target.value)} className="crm-input">
            <option value="">Selecione uma empresa</option>
            {options.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-[var(--ink-soft)] sm:col-span-2">
          Nome do negócio
          <input name="name" placeholder="Ex.: Projeto de aquisição" className="crm-input" />
        </label>
        <label className="text-xs font-semibold text-[var(--ink-soft)]">
          Valor
          <input name="value" type="number" min="0" step="0.01" className="crm-input" />
        </label>
        <label className="text-xs font-semibold text-[var(--ink-soft)]">
          Serviço
          <select name="serviceId" className="crm-input">
            <option value="">Sem serviço</option>
            {options.services.filter((item) => item.active).map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-[var(--ink-soft)]">
          Contato
          <select name="contactId" className="crm-input">
            <option value="">Sem contato</option>
            {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}{contact.role ? ` · ${contact.role}` : ""}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-[var(--ink-soft)]">
          Responsável
          <select name="ownerId" className="crm-input">
            <option value="">Sem responsável</option>
            {options.owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-[var(--ink-soft)]">
          Etapa
          <select name="stage" defaultValue="new" className="crm-input">
            {dealStages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-[var(--ink-soft)]">
          Fechamento previsto
          <input name="expectedCloseDate" type="date" defaultValue={defaultCloseDate()} className="crm-input" />
        </label>
        <label className="text-xs font-semibold text-[var(--ink-soft)] sm:col-span-2">
          Resumo
          <textarea name="summary" rows={3} placeholder="Contexto e próximo objetivo do negócio" className="crm-input" />
        </label>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="lume-button lume-button--outline" disabled={pending}>Cancelar</button>
        <button type="submit" className="lume-button lume-button--solid" disabled={pending || !companyId}>{pending ? "Salvando..." : "Adicionar negócio"}</button>
      </div>
    </form>
  );
}
