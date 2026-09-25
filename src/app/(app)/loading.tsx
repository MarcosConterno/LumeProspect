export default function AppLoading() {
  return <div className="space-y-7" aria-label="Carregando página" role="status">
    <div className="space-y-3">
      <div className="h-3 w-24 animate-pulse rounded-full bg-[var(--border-soft)]" />
      <div className="h-9 w-64 animate-pulse rounded-lg bg-[var(--border-soft)]" />
      <div className="h-4 w-96 max-w-full animate-pulse rounded-full bg-[var(--border-soft)]" />
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="h-28 animate-pulse rounded-xl bg-[var(--border-soft)]" />
      <div className="h-28 animate-pulse rounded-xl bg-[var(--border-soft)]" />
      <div className="h-28 animate-pulse rounded-xl bg-[var(--border-soft)]" />
      <div className="h-28 animate-pulse rounded-xl bg-[var(--border-soft)]" />
    </div>
  </div>;
}
