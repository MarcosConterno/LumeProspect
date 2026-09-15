import Link from "next/link";
import { getProfile, toValues } from "@/features/administration/repository";
import { RecordForm } from "@/features/administration/components/record-form";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const [{ record, user, active }, params] = await Promise.all([getProfile(),searchParams]);
  return <div className="max-w-3xl space-y-6">
    <header><p className="text-sm text-accent-dark">Administração</p><h1 className="mt-2 font-display text-3xl">Meu perfil</h1><p className="mt-2 text-sm text-[var(--ink-soft)]">Seu nome é compartilhado com as equipes das quais você participa.</p></header>
    {params.saved === "1" && <p role="status" className="rounded-lg bg-[var(--accent-soft)] p-3 text-sm">Perfil atualizado.</p>}
    <section className="rounded-xl border border-border bg-surface p-5">
      <RecordForm key={record.version} target={{kind:"profile",workspace:active.workspace_id,id:user.id,version:record.version}} initial={toValues(record)} cancelHref="/perfil" />
    </section>
    <section className="space-y-3 rounded-xl border border-border bg-surface p-5"><h2 className="font-display text-xl">Acesso à conta</h2><p className="break-all text-sm">E-mail de login: {user.email}</p><Link href="/recuperar-senha" className="inline-block text-sm underline">Solicitar link para alterar a senha</Link></section>
  </div>;
}

