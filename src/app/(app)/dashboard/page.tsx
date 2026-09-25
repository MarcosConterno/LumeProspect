import Link from "next/link";
import { getAdministrationSummary } from "@/features/administration/repository";

const cards = [
  { title:"Clientes ativos",path:"/clientes",description:"Clientes e empresas em negociação" },
  { title:"Contatos ativos",path:"/clientes",description:"Acesse um cliente para ver seus contatos" },
  { title:"Serviços ativos",path:"/servicos",description:"Catálogo disponível para o CRM" },
  { title:"Usuários",path:"/configuracoes/usuarios",description:"Acessos à sua empresa" },
];
export default async function DashboardPage() {
  const { name, counts, canManageUsers } = await getAdministrationSummary();
  return <div className="space-y-7">
    <header><p className="text-sm text-accent-dark">Visão geral</p><h1 className="mt-2 font-display text-3xl">{name}</h1><p className="mt-2 text-sm text-[var(--ink-soft)]">Cadastros e equipe da empresa ativa.</p></header>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card,index) => index===3 && !canManageUsers ? null : <Link key={card.title} href={card.path} className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent">
      <h2 className="text-sm">{card.title}</h2><p className="my-3 font-display text-4xl">{counts[index]}</p><p className="text-xs text-[var(--ink-soft)]">{card.description}</p>
    </Link>)}</div>
    <section className="space-y-4 rounded-xl border border-border bg-surface p-5"><h2 className="font-display text-xl">Organize seus cadastros</h2><ol className="list-inside list-decimal space-y-3 text-sm">
      <li><Link href="/configuracoes" className="underline">Confira as configurações da sua empresa</Link>{canManageUsers && <> e <Link href="/configuracoes/usuarios" className="underline">os acessos dos usuários</Link></>}.</li>
      <li><Link href="/clientes" className="underline">Cadastre os clientes atendidos</Link> e vincule os contatos dentro de cada cadastro.</li>
      <li><Link href="/servicos" className="underline">Organize o catálogo de serviços</Link>.</li>
    </ol></section>
    <p className="text-sm text-[var(--ink-soft)]">O CRM ainda está em demonstração. O financeiro utiliza dados reais; a prospecção será a última etapa.</p>
  </div>;
}
