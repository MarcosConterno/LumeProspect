"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { saveMaster, searchCompanies } from "../actions";
import { fields, type CompanyOption, type SaveTarget, type Values } from "../types";

const inputClass = "mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm disabled:opacity-70";
const buttonClass = "rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50";

function CompanyField({ workspace, initial }: { workspace: string; initial: CompanyOption | null }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(initial?.id ?? "");
  const [options, setOptions] = useState<CompanyOption[]>(initial ? [initial] : []);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  return <div className="space-y-2 sm:col-span-2">
    <label className="block text-sm">Buscar empresa pelo nome
      <input type="search" value={query} maxLength={100} onChange={event => setQuery(event.target.value)} className={inputClass} />
    </label>
    <button type="button" disabled={pending} className={buttonClass} onClick={() => startTransition(async () => {
      try {
      const result = await searchCompanies(workspace,query);
      if (result.error) { setMessage(result.error); return; }
      const found = result.data ?? [];
      setOptions(previous => {
        const current = previous.find(option => option.id === selected);
        return current && !found.some(option => option.id === current.id) ? [current,...found] : found;
      });
      setMessage(found.length === 20 ? "Exibindo até 20 resultados. Refine o nome para encontrar outra empresa." : found.length ? "Selecione uma empresa abaixo." : "Nenhuma empresa ativa encontrada. Cadastre-a em Clientes e empresas.");
      } catch { setMessage("A busca falhou. Confira sua conexão e tente novamente."); }
    })}>{pending ? "Buscando…" : "Buscar empresas"}</button>
    <label className="block text-sm">Empresa vinculada *
      <select name="company_id" required value={selected} onChange={event => setSelected(event.target.value)} className={inputClass}>
        <option value="">Selecione uma empresa</option>
        {options.map(option => <option key={option.id} value={option.id}>{option.name}{option.lifecycle_status === "inactive" ? " (inativa — vínculo existente)" : ""}</option>)}
      </select>
    </label>
    <p role="status" className="text-xs text-[var(--ink-soft)]">{message || "Busque pelo nome ou deixe a busca vazia para listar as primeiras empresas ativas."}</p>
  </div>;
}

export function RecordForm({ target, initial = {}, selectedCompany = null, readOnly = false, cancelHref }: {
  target: SaveTarget; initial?: Values; selectedCompany?: CompanyOption | null; readOnly?: boolean; cancelHref: string;
}) {
  const [values, setValues] = useState<Values>(() => Object.fromEntries(fields[target.kind].map(field =>
    [field.name, initial[field.name] ?? field.options?.[0]?.[0] ?? ""]
  )));
  const [state, action, pending] = useActionState(saveMaster.bind(null,target), {});
  return <form action={action} className="space-y-5">
    <fieldset disabled={readOnly || pending} className="grid gap-4 sm:grid-cols-2">
      <legend className="sr-only">Dados do cadastro</legend>
      {target.kind === "contact" && <CompanyField workspace={target.workspace} initial={selectedCompany} />}
      {fields[target.kind].map(field => <label key={field.name} className={`block text-sm ${field.type === "textarea" ? "sm:col-span-2" : ""}`}>
        {field.label}{field.required ? " *" : ""}
        {field.type === "select" ? <select name={field.name} value={values[field.name]} onChange={event => setValues(current => ({...current,[field.name]:event.target.value}))} className={inputClass}>
          {field.options?.map(([key,label]) => <option key={key} value={key}>{label}</option>)}
        </select> : field.type === "textarea" ? <textarea name={field.name} value={values[field.name]} maxLength={field.maxLength} rows={4} onChange={event => setValues(current => ({...current,[field.name]:event.target.value}))} className={inputClass} /> :
          <input type={field.type ?? "text"} name={field.name} value={values[field.name]} required={field.required} minLength={field.required ? 2 : undefined} maxLength={field.maxLength} onChange={event => setValues(current => ({...current,[field.name]:event.target.value}))} className={inputClass} />}
      </label>)}
    </fieldset>
    {state.error && <div role="alert" className="space-y-2 text-sm text-red-700"><p>{state.error}</p><a className="underline" href={target.id ? cancelHref + (cancelHref.includes("?") ? "&" : "?") + "edit=" + target.id : cancelHref}>Recarregar dados (descarta alterações não salvas)</a></div>}
    {!readOnly && <div className="flex flex-wrap items-center gap-4">
      <button disabled={pending} className="rounded-lg bg-accent px-5 py-2 text-sm text-white disabled:opacity-50">{pending ? "Salvando…" : "Salvar cadastro"}</button>
      <Link href={cancelHref} className="text-sm underline">Voltar</Link>
    </div>}
    {["company","contact","service"].includes(target.kind) && <p className="text-xs text-[var(--ink-soft)]">Para deixar de usar um cadastro, altere sua situação para inativo. Os vínculos e o histórico permanecem.</p>}
  </form>;
}
