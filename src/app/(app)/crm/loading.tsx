export default function CrmLoading() {
  return (
    <section className="space-y-6" aria-busy="true" aria-label="Carregando CRM">
      <div className="space-y-2"><div className="h-3 w-16 animate-pulse rounded bg-[var(--accent-soft)]" /><div className="h-9 w-64 animate-pulse rounded bg-[var(--border-soft)]" /><div className="h-4 w-96 max-w-full animate-pulse rounded bg-[var(--border-soft)]" /></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-[var(--radius)] border border-[var(--border-soft)] bg-surface" />)}</div>
      <div className="h-[420px] animate-pulse rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-surface" />
    </section>
  );
}
