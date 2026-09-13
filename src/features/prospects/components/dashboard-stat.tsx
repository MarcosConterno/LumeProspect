type DashboardStatProps = {
  value: number;
  label: string;
  detail: string;
};

export function DashboardStat({ value, label, detail }: DashboardStatProps) {
  return (
    <article className="border border-[var(--border-soft)] p-5" style={{ borderRadius: "var(--radius)" }}>
      <p className="font-display text-3xl leading-none text-foreground">{value}</p>
      <h2 className="mt-2 text-[13px] font-semibold text-foreground">{label}</h2>
      <p className="mt-0.5 text-xs text-[var(--ink-faint)]">{detail}</p>
    </article>
  );
}
