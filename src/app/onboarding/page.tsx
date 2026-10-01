import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/features/auth/context";
import { signOut } from "@/features/auth/actions";
export default async function OnboardingPage() {
  const {user,active,isMaster}=await getWorkspaceContext();
  if(isMaster) redirect("/lume");
  if(active) redirect("/configuracoes");
  return <main className="mx-auto max-w-xl space-y-5 px-5 py-12"><h1 className="font-display text-3xl">Acesso à sua empresa</h1><p className="text-sm">{user.email}</p><p className="text-sm">Sua conta ainda não tem um ambiente ativo disponível. Fale com o administrador da sua empresa para conferir seu cadastro e suas permissões. Novas empresas são cadastradas pela Lume.</p><form action={signOut}><button className="underline">Sair da conta</button></form></main>;
}
