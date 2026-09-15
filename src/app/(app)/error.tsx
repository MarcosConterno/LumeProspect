"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="space-y-4 p-6"><h1 className="font-display text-2xl">Não foi possível carregar esta página</h1><p>Tente novamente. Se o problema continuar, confira sua conexão e o acesso à empresa.</p><button onClick={reset} className="rounded-lg bg-accent px-4 py-2 text-white">Tentar novamente</button></section>;
}
