import { AuthForm } from "@/features/auth/components/auth-form";
export default async function CadastroPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  return <AuthForm mode="signup" invite={(await searchParams).invite} />;
}
