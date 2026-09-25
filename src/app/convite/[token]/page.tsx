import Link from "next/link";

export default function InvitePage() {
  return <main className="mx-auto max-w-lg space-y-6 px-6 py-16">
    <h1 className="font-display text-3xl">Acesso cadastrado pelo administrador</h1>
    <p>Os links de convite foram desativados. Solicite seu cadastro ao administrador da empresa ou à Lume e entre com o e-mail e a senha definidos.</p>
    <Link href="/login" className="inline-block rounded-lg bg-accent px-4 py-3 text-white">Entrar na conta</Link>
  </main>;
}
