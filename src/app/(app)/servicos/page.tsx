import { redirect } from "next/navigation";
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const params=await searchParams;
  const query=new URLSearchParams();
  for(const key of ["q","status","page","edit","new","saved"]) {
    const value=params[key];
    if(typeof value==="string") query.set(key,value);
  }
  redirect("/configuracoes/servicos"+(query.size ? "?"+query.toString() : ""));
}
