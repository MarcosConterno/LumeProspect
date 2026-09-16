import Link from "next/link";
import { loadClient } from "@/features/platform/repository";
import { PlatformUserForm } from "@/features/platform/components/user-form";
import { PlatformInvite } from "@/features/platform/components/forms";
import { authAdminConfigured } from "@/lib/supabase/admin";

export default async function ClientUsersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { workspace } = await loadClient(id);

  return <div className="mx-auto max-w-2xl space-y-6">
    <Link href="/lume" className="inline-block text-sm text-accent-dark underline">← Voltar para empresas</Link>
    <header>
      <h1 className="font-display text-3xl">Criar usuário</h1>
      <p className="mt-3 text-sm text-[var(--ink-soft)]">Cadastre o acesso da pessoa à empresa abaixo.</p>
    </header>
    <div className="rounded-xl border border-border bg-[var(--accent-soft)] p-4">
      <p className="text-xs text-[var(--ink-soft)]">Empresa que receberá o usuário</p>
      <p className="mt-1 text-lg font-semibold">{workspace.name}</p>
      <Link href="/lume" className="mt-2 inline-block text-sm text-accent-dark underline">Escolher outra empresa</Link>
    </div>
    {workspace.status === "active" ? <>
      <section aria-label="Cadastro de acesso" className="rounded-xl border border-border bg-surface p-5 sm:p-6">
        <PlatformUserForm workspace={id} canCreate={authAdminConfigured()} />
      </section>
      <details className="rounded-xl border border-border bg-surface p-5">
        <summary className="cursor-pointer font-medium">Prefere gerar um convite para o administrador?</summary>
        <div className="mt-4 space-y-4">
          <p className="text-sm text-[var(--ink-soft)]">Gere um link para a pessoa cadastrar a própria conta e aceitar o acesso como administrador desta empresa.</p>
          <PlatformInvite workspace={id} />
        </div>
      </details>
    </> : <div className="space-y-3 rounded-xl border border-border bg-surface p-5">
      <p>Esta empresa está suspensa. Reative-a antes de cadastrar usuários.</p>
      <Link href={"/lume/clientes/"+id} className="inline-block text-sm text-accent-dark underline">Abrir configuração da empresa</Link>
    </div>}
  </div>;
}
