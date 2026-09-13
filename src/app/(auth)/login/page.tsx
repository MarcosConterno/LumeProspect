import Link from "next/link";

export default function LoginPage() {
  return (
    <section className="w-full max-w-md space-y-6">
      <div className="text-center">
        <p className="mb-3 text-sm font-semibold text-accent-dark">Lume Prospect</p>
        <h1 className="text-3xl">Entrar na sua conta</h1>
        <p className="mt-2 text-[var(--ink-soft)]">A autenticação será conectada ao Supabase.</p>
      </div>
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-7 text-sm text-[var(--ink-faint)]">Placeholder de autenticação</div>
      <p className="text-center text-sm text-[var(--ink-soft)]">Ainda não tem conta? <Link className="font-semibold text-accent-dark" href="/cadastro">Criar cadastro</Link></p>
    </section>
  );
}
