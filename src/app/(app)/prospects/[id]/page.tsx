import { notFound } from "next/navigation";
import { ProspectDetail } from "@/features/prospects/components/prospect-detail";
import { prospectRecords } from "@/features/prospects/mocks/prospects";

type ProspectDetailPageProps = { params: Promise<{ id: string }> };

export default async function ProspectDetailPage({ params }: ProspectDetailPageProps) {
  const { id } = await params;
  const prospect = prospectRecords.find((item) => item.id === Number(id));
  if (!prospect) notFound();
  return <ProspectDetail prospect={prospect} />;
}
