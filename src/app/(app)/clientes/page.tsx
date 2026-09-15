import { RegistryPage } from "@/features/administration/components/registry-page";
export default function ClientsPage({ searchParams }: { searchParams: Promise<Record<string,string | string[] | undefined>> }) {
  return <RegistryPage kind="company" searchParams={searchParams} />;
}

