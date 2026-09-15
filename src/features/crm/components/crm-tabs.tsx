export type CrmView = "pipeline" | "list" | "forecast";

export function CrmTabs({ active, onChange }: { active: CrmView; onChange: (view: CrmView) => void }) {
  return <div role="tablist" aria-label="Visualizações do CRM" className="flex gap-6 border-b border-[var(--border-soft)]">{([["pipeline", "Pipeline"], ["list", "Lista"], ["forecast", "Previsão"]] as const).map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={active === id} onClick={() => onChange(id)} className={`border-b-2 px-1 py-3 text-sm font-semibold transition-colors ${active === id ? "border-accent text-[var(--accent-dark)]" : "border-transparent text-[var(--ink-soft)] hover:text-foreground"}`}>{label}</button>)}</div>;
}
