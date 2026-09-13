type PagePlaceholderProps = {
  eyebrow?: string;
  title: string;
  description: string;
};

export function PagePlaceholder({ eyebrow = "Estrutura inicial", title, description }: PagePlaceholderProps) {
  return (
    <section className="space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-accent-dark">{eyebrow}</p>
      <h1 className="text-4xl text-foreground">{title}</h1>
      <p className="max-w-2xl text-[var(--ink-soft)]">{description}</p>
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6 text-sm text-[var(--ink-faint)]">
        Esta área está preparada para receber a experiência descrita na referência visual.
      </div>
    </section>
  );
}
