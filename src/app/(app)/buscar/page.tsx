import { ProspectSearch } from "@/features/prospects/components/prospect-search";

export default function BuscarPage() {
  return <section><p className="mb-2 text-[11px] uppercase tracking-[0.08em] text-[var(--ink-faint)]">Nova busca</p><h1 className="font-display text-3xl">Buscar prospects</h1><p className="mb-8 mt-1 text-[var(--ink-soft)]">Ajuste o contexto e os filtros e deixe a IA localizar as melhores empresas para você.</p><ProspectSearch /></section>;
}
