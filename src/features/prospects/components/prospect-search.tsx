"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const segments = ["Software House", "Consultoria de Negócios", "Marketing Digital", "SaaS", "RH Tech", "Legaltech"];

export function ProspectSearch() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [region, setRegion] = useState("Todo o Brasil");
  const [segment, setSegment] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (keyword) params.set("keyword", keyword);
    if (region !== "Todo o Brasil") params.set("region", region);
    if (segment) params.set("segment", segment);
    router.push(`/prospects?${params.toString()}`);
  }

  return <form onSubmit={submit} className="max-w-2xl rounded-[var(--radius-lg)] border border-border bg-surface p-6 sm:p-7"><label className="text-xs font-semibold text-foreground">O que você está buscando agora?<textarea rows={3} value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Ex: empresas de tecnologia em expansão que ainda não têm CRM..." className="mt-2 w-full resize-none rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-accent" /></label><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-[var(--ink-soft)]">Localização<select value={region} onChange={(event) => setRegion(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"><option>Todo o Brasil</option><option>Norte</option><option>Nordeste</option><option>Centro-Oeste</option><option>Sudeste</option><option>Sul</option></select></label><label className="text-xs font-semibold text-[var(--ink-soft)]">Área de negócio<select value={segment} onChange={(event) => setSegment(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"><option value="">Todas as áreas</option>{segments.map((item) => <option key={item}>{item}</option>)}</select></label></div><button type="submit" className="mt-5 w-full rounded-lg bg-foreground px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">✦ Buscar com IA</button></form>;
}
