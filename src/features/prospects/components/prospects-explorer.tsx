"use client";

import Link from "next/link";
import { useState } from "react";
import type { DashboardProspect } from "@/features/prospects/mocks/dashboard";

const regions = ["Todo o Brasil", "Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];
const segments = ["Software House", "Consultoria", "Marketing", "SaaS", "RH Tech", "Legaltech"];

function regionOf(location: string) {
  const state = location.slice(-2);
  if (["SP", "MG", "RJ", "ES"].includes(state)) return "Sudeste";
  if (["PR", "SC", "RS"].includes(state)) return "Sul";
  if (["PE", "BA", "CE", "PB", "RN", "AL", "SE", "MA", "PI"].includes(state)) return "Nordeste";
  if (["GO", "MT", "MS", "DF"].includes(state)) return "Centro-Oeste";
  if (["AM", "PA", "RO", "AC", "RR", "AP", "TO"].includes(state)) return "Norte";
  return "Outra";
}

export function ProspectList({ prospects, initialKeyword = "", initialRegion = "Todo o Brasil", initialSegment = "" }: { prospects: DashboardProspect[]; initialKeyword?: string; initialRegion?: string; initialSegment?: string }) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [region, setRegion] = useState(initialRegion);
  const [segment, setSegment] = useState(initialSegment);
  const [sort, setSort] = useState<"score" | "name">("score");
  const [favorites, setFavorites] = useState(() => new Set(prospects.filter((prospect) => prospect.favorite).map((prospect) => prospect.id)));

  const filtered = prospects
    .filter((prospect) => !keyword || `${prospect.name} ${prospect.segment} ${prospect.location}`.toLowerCase().includes(keyword.toLowerCase()))
    .filter((prospect) => region === "Todo o Brasil" || regionOf(prospect.location) === region)
    .filter((prospect) => !segment || prospect.segment.toLowerCase().includes(segment.toLowerCase().split(" ")[0]));
  const sorted = [...filtered].sort((a, b) => sort === "score" ? b.score - a.score : a.name.localeCompare(b.name));

  return (
    <div>
      <div className="mb-6 grid gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4 sm:grid-cols-[1fr_180px_180px]">
        <label className="text-xs font-semibold text-[var(--ink-soft)]">Palavra-chave<input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Empresa, nicho..." className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent" /></label>
        <label className="text-xs font-semibold text-[var(--ink-soft)]">Localização<select value={region} onChange={(event) => setRegion(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent">{regions.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="text-xs font-semibold text-[var(--ink-soft)]">Área de negócio<select value={segment} onChange={(event) => setSegment(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"><option value="">Todas as áreas</option>{segments.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      <div className="mb-3 flex items-center justify-between gap-4"><p className="text-sm text-[var(--ink-soft)]">{sorted.length} empresas encontradas pela IA</p><div className="flex gap-2"><button type="button" onClick={() => setSort("score")} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${sort === "score" ? "border-foreground text-foreground" : "border-border text-[var(--ink-soft)]"}`}>Maior score</button><button type="button" onClick={() => setSort("name")} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${sort === "name" ? "border-foreground text-foreground" : "border-border text-[var(--ink-soft)]"}`}>Nome</button></div></div>
      {sorted.length ? <div>{sorted.map((prospect) => <ProspectListRow key={prospect.id} prospect={prospect} favorite={favorites.has(prospect.id)} onFavorite={() => setFavorites((current) => { const next = new Set(current); if (next.has(prospect.id)) { next.delete(prospect.id); } else { next.add(prospect.id); } return next; })} />)}</div> : <div className="border border-dashed border-border px-5 py-16 text-center text-sm text-[var(--ink-faint)]"><p className="font-display text-lg text-foreground">Nenhum prospect com esses filtros</p><p className="mt-1">Tente ajustar a área de negócio ou a localização.</p></div>}
    </div>
  );
}

function ProspectListRow({ prospect, favorite, onFavorite }: { prospect: DashboardProspect; favorite: boolean; onFavorite: () => void }) {
  return <div className="group flex items-center gap-4 border-b border-[var(--border-soft)] px-1 py-4 hover:bg-[#f6f5f2]"><Link href={`/prospects/${prospect.id}`} className="flex min-w-0 flex-1 items-center gap-4 focus-visible:outline-2 focus-visible:outline-accent"><span className={`score-badge score-${prospect.potential}`}>{prospect.score}</span><span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><span className="truncate text-sm font-semibold">{prospect.name}</span><span className={`potential-tag potential-${prospect.potential}`}>{prospect.potential === "alto" ? "Alto potencial" : prospect.potential === "medio" ? "Médio potencial" : "Baixo potencial"}</span></span><span className="block text-xs text-[var(--ink-soft)]">{prospect.segment} · {prospect.location} · {prospect.insight}</span></span></Link><button type="button" aria-label={favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"} onClick={onFavorite} className={`px-2 text-xl ${favorite ? "text-[var(--amber)]" : "text-[var(--border)] hover:text-[var(--amber)]"}`}>{favorite ? "★" : "☆"}</button></div>;
}
