import { PagePlaceholder } from "@/components/ui/page-placeholder";

type ProspectDetailPageProps = { params: Promise<{ id: string }> };

export default async function ProspectDetailPage({ params }: ProspectDetailPageProps) {
  const { id } = await params;
  return <PagePlaceholder eyebrow={`Prospect ${id}`} title="Detalhe do prospect" description="Perfil, score, contexto e ações comerciais do prospect selecionado." />;
}
