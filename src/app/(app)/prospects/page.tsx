import { ProspectList } from "@/features/prospects/components/prospects-explorer";
import { dashboardProspects } from "@/features/prospects/mocks/dashboard";

type ProspectsPageProps = { searchParams: Promise<{ keyword?: string; region?: string; segment?: string }> };

export default async function ProspectsPage({ searchParams }: ProspectsPageProps) {
  const params = await searchParams;
  return <section><h1 className="font-display text-3xl">Prospects</h1><p className="mb-8 mt-1 text-[var(--ink-soft)]">Empresas priorizadas pela inteligência do produto.</p><ProspectList prospects={dashboardProspects} initialKeyword={params.keyword} initialRegion={params.region || "Todo o Brasil"} initialSegment={params.segment} /></section>;
}
