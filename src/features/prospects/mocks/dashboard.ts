export type DashboardProspect = {
  id: number;
  name: string;
  score: number;
  potential: "alto" | "medio" | "baixo";
  segment: string;
  location: string;
  insight: string;
  favorite: boolean;
};

export const dashboardProspects: DashboardProspect[] = [
  {
    id: 1,
    name: "Nexus Soluções Digitais",
    score: 94,
    potential: "alto",
    segment: "Software House",
    location: "São Paulo, SP",
    insight: "Crescimento acelerado e presença digital desatualizada indicam alta receptividade.",
    favorite: true,
  },
  {
    id: 2,
    name: "Vértice Consultoria & Gestão",
    score: 87,
    potential: "alto",
    segment: "Consultoria de Negócios",
    location: "Belo Horizonte, MG",
    insight: "Expansão para novos estados sem stack digital adequado para suportar o crescimento.",
    favorite: true,
  },
  {
    id: 3,
    name: "Amplia Agência de Marketing",
    score: 79,
    potential: "alto",
    segment: "Agência de Marketing Digital",
    location: "Curitiba, PR",
    insight: "Portfólio forte, mas ausência de cases B2B limita o crescimento no ticket médio.",
    favorite: false,
  },
  {
    id: 4,
    name: "DataBridge Sistemas",
    score: 72,
    potential: "medio",
    segment: "Integração de Dados / SaaS",
    location: "Porto Alegre, RS",
    insight: "Produto técnico sólido, mas marketing e vendas ainda são tratados como secundários.",
    favorite: false,
  },
  {
    id: 5,
    name: "Stratos RH Inteligente",
    score: 61,
    potential: "medio",
    segment: "RH Tech / HRtech",
    location: "São Paulo, SP",
    insight: "Mercado competitivo, mas há oportunidade pontual em diferenciação de marca.",
    favorite: false,
  },
  {
    id: 6,
    name: "Forma Jurídica Digital",
    score: 48,
    potential: "baixo",
    segment: "Legaltech / Advocacia Empresarial",
    location: "Recife, PE",
    insight: "Setor conservador com baixo fit imediato, mas janela de oportunidade identificada.",
    favorite: false,
  },
];

export const dashboardMetrics = {
  approaches: 3,
  sentApproaches: 2,
  averageScore: Math.round(
    dashboardProspects.reduce((total, prospect) => total + prospect.score, 0) / dashboardProspects.length,
  ),
  favoriteCount: dashboardProspects.filter((prospect) => prospect.favorite).length,
};
