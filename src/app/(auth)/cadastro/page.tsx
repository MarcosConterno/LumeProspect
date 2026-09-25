import Link from "next/link";

export default function CadastroPage() {
  return <section className="w-full max-w-md space-y-6">
    <h1 className="font-display text-3xl">Solicite seu acesso</h1>
    <p>O administrador da sua empresa cadastra seu usuário e define seu papel. Entre com o e-mail e a senha que ele informar.</p>
    <Link href="/login" className="inline-block rounded-lg bg-accent px-4 py-3 text-white">Entrar na conta</Link>
  </section>;
}
