import { AuthForm } from "@/features/auth/components/auth-form";
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ invite?: string; error?: string; updated?: string }> }) {
  const params = await searchParams;
  return <AuthForm mode="login" invite={params.invite} notice={params.error ? "Não foi possível concluir o acesso pelo link. Se seu e-mail já foi confirmado, entre com e-mail e senha." : params.updated ? "Senha alterada. Entre com a nova senha." : undefined} />;
}
