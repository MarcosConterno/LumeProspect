import { redirect } from "next/navigation";
import { validId } from "@/features/administration/validation";
export default async function Page({params}:{params:Promise<{id:string}>}) {
  redirect("/configuracoes/usuarios?empresa="+validId((await params).id));
}
