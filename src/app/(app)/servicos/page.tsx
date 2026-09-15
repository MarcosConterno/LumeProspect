import { RegistryPage } from "@/features/administration/components/registry-page";
export default function ServicesPage({ searchParams }: { searchParams: Promise<Record<string,string | string[] | undefined>> }) {
  return <RegistryPage kind="service" searchParams={searchParams} />;
}
