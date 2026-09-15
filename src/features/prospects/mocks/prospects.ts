import { dashboardProspects, type DashboardProspect } from "@/features/prospects/mocks/dashboard";

export type ProspectRecord = DashboardProspect & {
  companySize: string;
  revenue: string;
  document: string;
  decisionMaker: {
    name: string;
    role: string;
    phone: string;
    email: string;
    website: string;
    linkedin: string;
  };
  painPoint: string;
  recommendedService: string;
  reasons: string[];
  axes: { name: string; value: number }[];
};

const enriched: Record<number, Omit<ProspectRecord, keyof DashboardProspect>> = {
  1: {
    companySize: "28–45 funcionários",
    revenue: "R$ 3,2M – 6M/ano",
    document: "34.512.876/0001-44",
    decisionMaker: { name: "Rodrigo Mendes", role: "CEO & Co-fundador", phone: "(11) 98234-5678", email: "contato@nexusdigital.com.br", website: "nexusdigital.com.br", linkedin: "linkedin.com/company/nexus-digital" },
    painPoint: "A empresa cresceu 3x em 18 meses, mas ainda usa processos manuais de vendas, sem CRM ou cadência estruturada.",
    recommendedService: "Implementação de CRM + Consultoria de Outbound Comercial",
    reasons: ["Publicou quatro vagas de vendas nos últimos 30 dias, sinal de escala comercial sem estrutura.", "Site sem blog, cases publicados ou prova social visível.", "Fundador ativo no LinkedIn e aberto a conversas sobre crescimento.", "Ticket médio estimado torna o retorno de uma melhoria comercial imediato."],
    axes: [{ name: "Compatibilidade", value: 96 }, { name: "Momento", value: 92 }, { name: "Digital", value: 65 }, { name: "Financeiro", value: 90 }, { name: "Localização", value: 85 }],
  },
  2: {
    companySize: "15–30 funcionários",
    revenue: "R$ 1,8M – 4M/ano",
    document: "28.901.234/0001-10",
    decisionMaker: { name: "Fernanda Costa", role: "Sócia-diretora", phone: "(31) 99123-4567", email: "contato@verticeconsultoria.com.br", website: "verticeconsultoria.com.br", linkedin: "linkedin.com/company/vertice-consultoria" },
    painPoint: "Está abrindo escritórios em dois novos estados, mas não tem processo de geração de demanda replicável.",
    recommendedService: "Sistemas & Automação + Consultoria de Gestão Comercial",
    reasons: ["Anunciou expansão para São Paulo e Rio Grande do Sul.", "Nenhuma automação de marketing identificada no site.", "Equipe comercial pequena para o volume de expansão."],
    axes: [{ name: "Compatibilidade", value: 88 }, { name: "Momento", value: 90 }, { name: "Digital", value: 58 }, { name: "Financeiro", value: 80 }, { name: "Localização", value: 78 }],
  },
  3: {
    companySize: "10–18 funcionários",
    revenue: "R$ 900k – 2M/ano",
    document: "19.345.678/0001-90",
    decisionMaker: { name: "Juliana Prado", role: "Diretora de Operações", phone: "(41) 99876-5432", email: "contato@ampliamkt.com.br", website: "ampliamkt.com.br", linkedin: "linkedin.com/company/amplia-marketing" },
    painPoint: "Portfólio majoritariamente B2C limita o ticket médio e a previsibilidade de receita.",
    recommendedService: "Consultoria Comercial + Branding B2B",
    reasons: ["Portfólio 90% B2C em busca de diversificação.", "Equipe de design forte, mas sem processo comercial estruturado."],
    axes: [{ name: "Compatibilidade", value: 82 }, { name: "Momento", value: 74 }, { name: "Digital", value: 88 }, { name: "Financeiro", value: 70 }, { name: "Localização", value: 80 }],
  },
};

export const prospectRecords: ProspectRecord[] = dashboardProspects.map((prospect) => ({
  ...prospect,
  companySize: enriched[prospect.id]?.companySize ?? "5–15 funcionários",
  revenue: enriched[prospect.id]?.revenue ?? "R$ 600k – 1,2M/ano",
  document: enriched[prospect.id]?.document ?? "Não informado",
  decisionMaker: enriched[prospect.id]?.decisionMaker ?? { name: "Contato principal", role: "Decisor", phone: "Não informado", email: "Não informado", website: "Não informado", linkedin: "Não informado" },
  painPoint: enriched[prospect.id]?.painPoint ?? prospect.insight,
  recommendedService: enriched[prospect.id]?.recommendedService ?? "Consultoria Comercial",
  reasons: enriched[prospect.id]?.reasons ?? [prospect.insight],
  axes: enriched[prospect.id]?.axes ?? [{ name: "Compatibilidade", value: prospect.score }, { name: "Momento", value: prospect.score }, { name: "Digital", value: prospect.score }],
}));
