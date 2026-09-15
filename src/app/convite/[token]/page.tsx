import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AcceptInviteForm } from "@/features/auth/components/team-forms";
import { signOut } from "@/features/auth/actions";
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  const valid = /^[a-f0-9]{64}$/.test(token);
  return <main className="mx-auto max-w-lg space-y-6 px-6 py-16"><p className="text-sm text-accent-dark">Lume Prospect</p><h1 className="font-display text-3xl">Convite para uma equipe</h1>{!valid ? <p role="alert">Este link de convite é inválido.</p> : user ? <><p className="text-sm">Você está conectado como {user.email}. O convite só pode ser aceito com o e-mail confirmado para o qual foi criado.</p><AcceptInviteForm token={token} /><form action={signOut}><button className="text-sm underline">Sair para usar outra conta</button></form></> : <><p>Entre ou crie sua conta com o e-mail que recebeu o convite. Depois de confirmar o cadastro, abra este link novamente para aceitar.</p><div className="flex gap-4"><Link className="rounded-lg bg-accent px-4 py-2 text-white" href={`/login?invite=${token}`}>Entrar</Link><Link className="rounded-lg border border-border px-4 py-2" href={`/cadastro?invite=${token}`}>Criar conta</Link></div></>}</main>;
}
