import { RegistryPage } from "@/features/administration/components/registry-page";
export default function ContactsPage({ searchParams }: { searchParams: Promise<Record<string,string | string[] | undefined>> }) {
  return <RegistryPage kind="contact" searchParams={searchParams} />;
}

