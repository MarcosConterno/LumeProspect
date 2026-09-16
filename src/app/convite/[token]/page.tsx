import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AcceptInviteForm } from "@/features/auth/components/team-forms";
import { switchInviteAccount } from "@/features/auth/actions";
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  const valid = /^[a-f0-9]{64}$/.test(token);
  const preview = valid && user ? await db.rpc("preview_workspace_invite", { token }) : null;
  const data = preview?.data;
  const info = data && typeof data === "object" && !Array.isArray(data) ? data : null;
  const master = info?.role === "master";
  return <main className="mx-auto max-w-lg space-y-6 px-6 py-16">
    <p className="text-sm text-accent-dark">Lume Prospect</p>
    <h1 className="font-display text-3xl">{master ? "Convite para master Lume" : "Confirmar seu acesso"}</h1>
    {!valid ? <p role="alert">Este link de convite é inválido.</p> : user ? <>
      <p className="text-sm">Conta conectada: <strong>{user.email}</strong></p>
      {preview?.error ? <p role="alert">Não foi possível consultar o convite. Solicite à administração a atualização do fluxo de convites e tente novamente.</p> : info?.status === "pending" ? <>
        <div className="space-y-3 rounded-xl border border-border bg-[var(--accent-soft)] p-4">
          <p className="font-semibold">{master ? "Master Lume — todas as empresas e módulos" : info.role === "admin" ? "Administrador da empresa" : "Usuário da empresa"}</p>
          <p className="text-sm">{master ? "Você poderá administrar a plataforma, acessar todas as empresas e usar todos os módulos." : "Empresa: " + String(info.company ?? "")}</p>
        </div>
        <p className="text-sm">Entrar na conta não aceita o convite automaticamente. Confirme o acesso abaixo.</p>
        <AcceptInviteForm token={token} master={master} />
      </> : info?.status === "accepted" ? <>
        <p>Este convite já foi aceito. Abra a plataforma para consultar seu acesso atual.</p>
        <Link className="inline-block rounded-lg bg-accent px-4 py-3 text-white" href="/onboarding">Entrar na plataforma</Link>
      </> : <p role="alert">{info?.status === "expired" ? "Este convite expirou. Peça um novo link à administração." : info?.status === "other_company" ? "Esta conta está vinculada a outra empresa. O convite não pode transferir esse vínculo. Peça à Lume para conferir a conta antes de continuar." : "O convite não está disponível para esta conta. Confira se entrou com o e-mail convidado e confirmado. O link também pode ter sido revogado."}</p>}
      <form action={switchInviteAccount.bind(null, token)}><button className="text-sm underline">Sair e entrar com outra conta</button></form>
    </> : <>
      <p>Entre com o e-mail convidado. Depois do login, você voltará a esta tela para conferir o perfil e aceitar o acesso.</p>
      <div className="flex flex-wrap gap-4">
        <Link className="rounded-lg bg-accent px-4 py-2 text-white" href={`/login?invite=${token}`}>Já tenho conta — entrar</Link>
        <Link className="rounded-lg border border-border px-4 py-2" href={`/cadastro?invite=${token}`}>Criar minha conta</Link>
      </div>
    </>}
  </main>;
}
