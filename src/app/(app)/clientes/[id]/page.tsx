import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordForm } from "@/features/administration/components/record-form";
import { getClientDetail, toValues } from "@/features/administration/repository";
import { validId } from "@/features/administration/validation";

const statusLabels: Record<string, string> = { prospect: "Em negociação", customer: "Cliente", inactive: "Inativo" };

type ClientPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string; editar?: string; novoContato?: string; editContato?: string; saved?: string }>;
};

export default async function ClientPage({ params, searchParams }: ClientPageProps) {
  const { id } = await params;
  try { validId(id); } catch { notFound(); }
  const query = await searchParams;
  const data = await getClientDetail(id, query);
  const returnTo = `/clientes/${id}`;
  const contactFormOpen = Boolean(query.novoContato) || Boolean(data.contactRecord);
  const contactTarget = data.contactRecord
    ? { kind: "contact" as const, workspace: data.active.workspace_id, id: data.contactRecord.id, version: Number(data.contactRecord.version), companyId: id, returnTo }
    : { kind: "contact" as const, workspace: data.active.workspace_id, companyId: id, returnTo };

  return <div className="mx-auto max-w-6xl space-y-8">
    <div className="flex items-center gap-2 text-sm text-[var(--ink-soft)]"><Link href="/clientes" className="font-medium text-accent-dark hover:underline">Clientes</Link><span aria-hidden="true">/</span><span className="truncate">{data.company.name}</span></div>

    <header className="flex flex-wrap items-start justify-between gap-5 rounded-2xl border border-border bg-surface p-6 sm:p-8">
      <div className="min-w-0"><p className="eyebrow">Cadastro do cliente</p><h1 className="mt-2 break-words font-display text-3xl sm:text-4xl">{data.company.name}</h1><p className="mt-2 text-sm text-[var(--ink-soft)]">{data.company.legal_name || data.company.location || "Dados comerciais e contatos do cliente."}</p></div>
      <div className="flex flex-wrap items-center gap-3"><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${data.company.lifecycle_status === "inactive" ? "bg-background text-[var(--ink-soft)]" : "bg-[var(--accent-soft)] text-accent-dark"}`}>{statusLabels[data.company.lifecycle_status] || data.company.lifecycle_status}</span>{data.canUpdate && <Link href={`${returnTo}?editar=1`} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:border-accent">Editar dados</Link>}</div>
    </header>

    {query.saved === "1" && <p role="status" className="rounded-lg bg-[var(--accent-soft)] p-3 text-sm">Cadastro salvo.</p>}

    {data.editingCompany ? <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8"><div className="mb-6"><p className="eyebrow">Dados principais</p><h2 className="font-display text-2xl">Editar cliente</h2><p className="mt-1 text-sm text-[var(--ink-soft)]">Atualize as informações usadas pela equipe no CRM.</p></div><RecordForm target={{ kind: "company", workspace: data.active.workspace_id, id: data.company.id, version: data.company.version, returnTo }} initial={toValues(data.company)} cancelHref={returnTo} /></section> : <CompanySummary company={data.company} />}

    <section id="contatos" className="scroll-mt-6 space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Relacionamento</p><h2 className="font-display text-2xl sm:text-3xl">Contatos</h2><p className="mt-1 text-sm text-[var(--ink-soft)]">Pessoas vinculadas a {data.company.name}.</p></div>{data.canCreate && !contactFormOpen && <Link href={`${returnTo}?novoContato=1#contatos`} className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-dark">Novo contato</Link>}</header>
      {contactFormOpen && (data.contactRecord ? data.canUpdate : data.canCreate) && <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8"><div className="mb-6"><p className="eyebrow">{data.contactRecord ? "Atualização" : "Novo cadastro"}</p><h3 className="font-display text-2xl">{data.contactRecord ? "Editar contato" : "Adicionar contato"}</h3></div><RecordForm target={contactTarget} initial={data.contactRecord} selectedCompany={data.selectedCompany} companyLocked cancelHref={`${returnTo}#contatos`} /></section>}
      {!data.contacts.length && !contactFormOpen && <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center"><p className="font-display text-xl">Nenhum contato cadastrado</p><p className="mt-2 text-sm text-[var(--ink-soft)]">Adicione as pessoas que participam da relação com este cliente.</p>{data.canCreate && <Link href={`${returnTo}?novoContato=1#contatos`} className="mt-5 inline-flex rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">Adicionar primeiro contato</Link>}</div>}
      {data.contacts.length > 0 && <div className="divide-y divide-[#f5f4f1]">{data.contacts.map(contact => <ContactCard key={contact.id} contact={contact} canUpdate={data.canUpdate} href={`${returnTo}?editContato=${contact.id}#contatos`} />)}</div>}
    </section>
  </div>;
}

function CompanySummary({ company }: { company: { name: string; legal_name: string | null; document_number: string | null; segment: string | null; location: string | null; website: string | null; employee_range: string | null; revenue_range: string | null; lifecycle_status: string } }) {
  const values = [["Nome da empresa", company.name], ["Razão social", company.legal_name], ["CPF ou CNPJ", company.document_number], ["Segmento", company.segment], ["Cidade / UF", company.location], ["Site", company.website], ["Faixa de funcionários", company.employee_range], ["Faixa de faturamento", company.revenue_range], ["Situação", statusLabels[company.lifecycle_status] || company.lifecycle_status]];
  return <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8"><div className="mb-7"><p className="eyebrow">Visão cadastral</p><h2 className="font-display text-2xl">Dados do cliente</h2><p className="mt-1 text-sm text-[var(--ink-soft)]">Informações principais para consulta rápida.</p></div><dl className="grid gap-x-4 gap-y-5 sm:grid-cols-2">{values.map(([label, value]) => <div key={label} className="min-w-0"><dt className="mb-2 text-sm font-medium">{label}</dt><dd className={`min-h-10 rounded-full border border-border bg-background px-3 py-2 text-sm ${value ? "font-medium" : "text-[var(--ink-soft)]"}`}>{value || "Não informado"}</dd></div>)}</dl></section>;
}

function ContactCard({ contact, canUpdate, href }: { contact: { id: string; name: string; email: string | null; phone: string | null; role: string | null; active: boolean }; canUpdate: boolean; href: string }) {
  const initials = contact.name.split(" ").map(name => name[0]).slice(0, 2).join("").toUpperCase();
  return <article className="grid gap-4 py-5 md:grid-cols-[minmax(12rem,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center"><div className="flex min-w-0 items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-accent-dark">{initials}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-semibold">{contact.name}</h3><span className={`text-[10px] font-semibold ${contact.active ? "text-accent-dark" : "text-[var(--ink-soft)]"}`}>{contact.active ? "Ativo" : "Inativo"}</span></div><p className="mt-1 text-xs text-[var(--ink-soft)]">{contact.role || "Contato"}</p></div></div><p className="break-all text-sm text-[var(--ink-soft)]">{contact.email || "Sem e-mail"}</p><p className="text-sm text-[var(--ink-soft)]">{contact.phone || "Sem telefone"}</p>{canUpdate && <Link href={href} className="text-sm font-semibold text-accent-dark hover:underline md:justify-self-end">Editar</Link>}</article>;
}
