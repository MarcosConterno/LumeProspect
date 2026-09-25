"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";

const segments = [
  "Agência de Marketing",
  "Software House",
  "Consultoria",
  "SaaS B2B",
  "Desenvolvimento Web",
  "Design & UX",
  "Gestão & RH",
  "Financeiro & Contábil",
];
const services = [
  "Tráfego Pago",
  "SEO / Conteúdo",
  "Branding & Design",
  "Desenvolvimento de Sites",
  "Sistemas & Automação",
  "Consultoria Comercial",
  "Gestão de Redes Sociais",
  "E-mail Marketing",
  "Consultoria de Gestão",
  "Recrutamento & RH",
  "Assessoria Financeira",
  "Implementação de CRM",
];
const tickets = [
  "Até R$ 2.000/mês",
  "R$ 2.000 – R$ 5.000/mês",
  "R$ 5.000 – R$ 15.000/mês",
  "R$ 15.000 – R$ 50.000/mês",
  "Acima de R$ 50.000/mês",
  "Por projeto (pontual)",
];
const companySizes = [
  "1–10 funcionários",
  "11–50 funcionários",
  "51–200 funcionários",
  "201–1.000 funcionários",
  "Mais de 1.000 funcionários",
];
const regions = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul", "Todo o Brasil"];
const buyingSignals = [
  "Contratando pessoas",
  "Expandindo ou abrindo nova unidade",
  "Site ou redes sociais desatualizados",
  "Reclamações públicas recentes",
  "Troca recente de gestão ou sócios",
  "Investimento ou aporte recente",
];
const analysisSteps = [
  "Analisando o seu perfil de negócio…",
  "Mapeando segmentos com maior fit…",
  "Construindo seu ICP personalizado…",
  "Preparando os prospects mais relevantes…",
];

function toggleValue(current: string[], value: string) {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className={`rounded-full border px-3 py-2 text-xs font-medium transition-colors ${selected ? "border-accent-dark bg-[var(--accent-soft)] text-accent-dark" : "border-border bg-background text-[var(--ink-soft)] hover:border-accent"}`}>{label}</button>;
}

function OptionCard({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className={`flex items-center gap-2 rounded-lg border px-3 py-3 text-left text-xs font-medium transition-colors ${selected ? "border-accent-dark bg-[var(--accent-soft)] text-accent-dark" : "border-border bg-background text-[var(--ink-soft)] hover:border-accent"}`}><span className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${selected ? "border-accent-dark" : "border-border"}`}><span className={`size-2 rounded-full ${selected ? "bg-accent-dark" : "bg-transparent"}`} /></span>{label}</button>;
}

export function ProspectSearch() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [differential, setDifferential] = useState("");
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [ticket, setTicket] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [radius, setRadius] = useState(120);
  const [selectedSignals, setSelectedSignals] = useState<string[]>([]);
  const [exclusion, setExclusion] = useState("");
  const [error, setError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);

  useEffect(() => {
    if (!analyzing) return;
    const interval = window.setInterval(() => setAnalysisStep((current) => Math.min(current + 1, analysisSteps.length - 1)), 550);
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (selectedRegions.length === 1 && selectedRegions[0] !== "Todo o Brasil") params.set("region", selectedRegions[0]);
      if (selectedSegments[0]) params.set("segment", selectedSegments[0]);
      params.set("busca", "concluida");
      router.push(`/prospects?${params.toString()}`);
    }, 2_400);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [analyzing, router, selectedRegions, selectedSegments]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (description.trim().length < 20) {
      setError("Descreva um pouco melhor o seu negócio e o cliente que você procura.");
      return;
    }
    if (!selectedSegments.length || !selectedServices.length || !ticket || !companySize || !selectedRegions.length) {
      setError("Preencha pelo menos um segmento, um serviço, o ticket, o porte e a região de atuação.");
      return;
    }
    setError("");
    setAnalysisStep(0);
    setAnalyzing(true);
  }

  if (analyzing) {
    return <section aria-live="polite" className="max-w-2xl rounded-[var(--radius-lg)] border border-border bg-surface px-6 py-12 text-center sm:px-10"><div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--accent-soft)] text-2xl text-accent-dark">✦</div><h2 className="mt-5 font-display text-2xl">A IA está entendendo seu ICP…</h2><p className="mt-2 text-sm text-[var(--ink-soft)]">Isso leva apenas alguns segundos.</p><div className="mx-auto mt-8 max-w-md space-y-3 text-left">{analysisSteps.map((step, index) => <div key={step} className={`flex items-center gap-3 text-sm ${index <= analysisStep ? "text-foreground" : "text-[var(--ink-faint)]"}`}><span className={`flex size-5 shrink-0 items-center justify-center rounded-full text-xs ${index < analysisStep ? "bg-accent text-white" : index === analysisStep ? "border border-accent-dark text-accent-dark" : "border border-border"}`}>{index < analysisStep ? "✓" : index + 1}</span><span>{step}</span></div>)}</div></section>;
  }

  return <form onSubmit={submit} className="max-w-3xl rounded-[var(--radius-lg)] border border-border bg-surface p-6 sm:p-8"><p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-accent-dark">✦ Configuração do seu ICP</p><h2 className="mt-2 font-display text-2xl">Conte-nos sobre o seu negócio</h2><p className="mt-2 max-w-2xl text-sm text-[var(--ink-soft)]">A IA vai usar esse contexto para encontrar prospects muito mais relevantes para você.</p>
    <div className="mt-7 space-y-6">
      <FieldLabel label="Descreva o que você faz e o tipo de cliente que busca"><textarea required minLength={20} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ex: Sou dono de uma agência de marketing digital especializada em B2B..." className="mt-2 w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-accent" /></FieldLabel>
      <FieldLabel label="O que te diferencia da concorrência?" hint="opcional"><textarea rows={2} value={differential} onChange={(event) => setDifferential(event.target.value)} placeholder="Ex: Entrego em metade do prazo do mercado, com relatório semanal de resultado..." className="mt-2 w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-accent" /></FieldLabel>
      <ChoiceGroup label="Segmentos de interesse" hint="selecione todos que se aplicam"><div className="flex flex-wrap gap-2">{segments.map((item) => <Chip key={item} label={item} selected={selectedSegments.includes(item)} onClick={() => setSelectedSegments((current) => toggleValue(current, item))} />)}</div></ChoiceGroup>
      <ChoiceGroup label="Quais serviços você oferece?" hint="selecione todos que se aplicam"><div className="flex flex-wrap gap-2">{services.map((item) => <Chip key={item} label={item} selected={selectedServices.includes(item)} onClick={() => setSelectedServices((current) => toggleValue(current, item))} />)}</div></ChoiceGroup>
      <ChoiceGroup label="Qual é o seu ticket médio por cliente?"><div className="grid gap-2 sm:grid-cols-2">{tickets.map((item) => <OptionCard key={item} label={item} selected={ticket === item} onClick={() => setTicket(item)} />)}</div></ChoiceGroup>
      <ChoiceGroup label="Porte ideal da empresa-alvo"><div className="grid gap-2 sm:grid-cols-2">{companySizes.map((item) => <OptionCard key={item} label={item} selected={companySize === item} onClick={() => setCompanySize(item)} />)}</div></ChoiceGroup>
      <ChoiceGroup label="Região de atuação" hint="selecione todos que se aplicam"><div className="flex flex-wrap gap-2">{regions.map((item) => <Chip key={item} label={item} selected={selectedRegions.includes(item)} onClick={() => setSelectedRegions((current) => toggleValue(current, item))} />)}</div></ChoiceGroup>
      <div><p className="text-xs font-semibold text-foreground">Ou defina um raio a partir da sua base <span className="font-normal text-[var(--ink-faint)]">— mais preciso que a região</span></p><div className="mt-3 grid gap-4 rounded-lg border border-border bg-background p-4 sm:grid-cols-[1fr_180px] sm:items-end"><FieldLabel label="Cidade base"><input value={city} onChange={(event) => setCity(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent" /></FieldLabel><label className="text-xs text-[var(--ink-soft)]">Raio de busca: <strong className="text-foreground">{radius} km</strong><input type="range" min="10" max="500" step="10" value={radius} onChange={(event) => setRadius(Number(event.target.value))} className="mt-3 w-full accent-[var(--accent)]" /></label></div></div>
      <ChoiceGroup label="Sinais de que é um bom momento para abordar" hint="selecione todos que se aplicam"><div className="flex flex-wrap gap-2">{buyingSignals.map((item) => <Chip key={item} label={item} selected={selectedSignals.includes(item)} onClick={() => setSelectedSignals((current) => toggleValue(current, item))} />)}</div></ChoiceGroup>
      <FieldLabel label="Descreva um cliente que definitivamente não é para você" hint="opcional"><textarea rows={2} value={exclusion} onChange={(event) => setExclusion(event.target.value)} placeholder="Ex: Empresas com menos de 5 funcionários, ou que já têm agência de marketing contratada..." className="mt-2 w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-accent" /></FieldLabel>
    </div>
    {error && <p role="alert" className="mt-5 rounded-lg border border-[var(--coral)] bg-[var(--coral-soft)] p-3 text-sm text-[var(--coral)]">{error}</p>}
    <button type="submit" className="mt-7 w-full rounded-lg bg-foreground px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">✦ Analisar meu perfil com IA</button>
  </form>;
}

function FieldLabel({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="block text-xs font-semibold text-foreground">{label} {hint && <span className="font-normal text-[var(--ink-faint)]">— {hint}</span>}{children}</label>;
}

function ChoiceGroup({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <div><p className="text-xs font-semibold text-foreground">{label} {hint && <span className="font-normal text-[var(--ink-faint)]">— {hint}</span>}</p><div className="mt-3">{children}</div></div>;
}
