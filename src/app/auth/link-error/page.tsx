import Link from "next/link";
import { validInvite } from "@/features/auth/links";

export default async function AuthLinkErrorPage({ searchParams }: {
  searchParams: Promise<{ reason?: string; flow?: string; invite?:string }>;
}) {
  const params = await searchParams;
  const recovery = params.flow === "recovery";
  const expired = params.reason === "expired";
  const invite=validInvite(params.invite);
  const suffix=invite ? "?invite="+invite : "";

  return (
    <main className="mx-auto max-w-lg space-y-6 px-6 py-16">
      <p className="text-sm font-semibold text-accent-dark">Lume Prospect</p>
      <h1 className="font-display text-3xl">
        {expired ? "Este link expirou" : "Não foi possível concluir o acesso pelo link"}
      </h1>
      <p className="text-sm leading-relaxed text-[var(--ink-soft)]">
        {recovery
          ? "Solicite um novo link de recuperação e abra-o no mesmo navegador em que fez a solicitação."
          : "Seu e-mail pode já ter sido confirmado. Tente entrar com seu e-mail e senha. Se ainda precisar confirmar, abra o link no mesmo navegador em que iniciou o cadastro."}
      </p>
      {!expired && (
        <p className="text-sm leading-relaxed text-[var(--ink-soft)]">
          Isso pode acontecer quando o link já foi utilizado, foi aberto em outro navegador ou o endereço de retorno está configurado incorretamente.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Link href={(recovery ? "/recuperar-senha" : "/login")+suffix} className="rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white">
          {recovery ? "Solicitar novo link" : "Entrar com e-mail e senha"}
        </Link>
        {!recovery && <Link href={"/reenviar-confirmacao"+suffix} className="rounded-lg border border-border px-4 py-3 text-sm">Reenviar confirmação</Link>}
      </div>
    </main>
  );
}
