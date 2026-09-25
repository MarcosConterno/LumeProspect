import { RegistryPage } from "@/features/administration/components/registry-page";

export default function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  return <RegistryPage kind="service" searchParams={searchParams} basePath="/servicos" />;
}
