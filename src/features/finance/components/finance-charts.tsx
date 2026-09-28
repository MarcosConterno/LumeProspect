"use client";

import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { money, monthNames, percentChange, percentLabel } from "../format";
import type { FinanceSnapshot } from "../types";

const chartColors = ["#176b57", "#d95540", "#8eaaa0", "#b8862e", "#737880"];
type ChartTooltipProps = TooltipContentProps;

function DueIcon({ type }: { type: FinanceSnapshot["entries"][number]["type"] }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h5"/>{type === "receivable" ? <path d="m8 16 2 2 5-5"/> : <path d="M8 16h7M12 13l3 3-3 3"/>}</svg>;
}

function dueCaption(entry: FinanceSnapshot["entries"][number], today: string) {
  if (entry.dueDate === today) return "Hoje";
  const [, month, day] = entry.dueDate.split("-");
  return `${day} ${monthNames[Number(month) - 1]?.slice(0, 3).toUpperCase() ?? month}`;
}

function compactMoney(value: number) {
  const reais = Math.abs(value) / 100;
  if (reais >= 1_000_000) return `R$ ${(reais / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (reais >= 1_000) return `R$ ${(reais / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return money(value).replace(",00", "");
}

function FlowTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const items = payload.filter((item, index, all) => all.findIndex(candidate => candidate.dataKey === item.dataKey) === index);
  return <div className="finance-recharts-tooltip"><strong>{label}</strong>{items.map((item, index) => {
    const isPayable = item.dataKey === "payable";
    return <div key={`${String(item.dataKey)}-${index}`}><i className={isPayable ? "is-payable" : "is-receivable"} /><span>{item.name}</span><b>{money(Number(item.value ?? 0))}</b></div>;
  })}</div>;
}

function FlowChart({ snapshot }: { snapshot: FinanceSnapshot }) {
  const data = snapshot.monthly.length ? snapshot.monthly.map(item => ({ ...item, label: monthNames[item.month - 1]?.slice(0, 3) ?? "" })) : Array.from({ length: 12 }, (_, index) => ({ month: index + 1, label: monthNames[index].slice(0, 3), receivable: 0, payable: 0 }));
  const currentIndex = Number(snapshot.month.slice(5, 7)) - 1;
  const current = data[currentIndex] ?? { receivable: 0, payable: 0 };
  const previous = data[currentIndex - 1];
  const comparison = (field: "receivable" | "payable") => previous ? percentChange(current[field], previous[field]) : null;
  const trend = (value: number | null) => value === null ? "" : `${value >= 0 ? "↑" : "↓"} ${percentLabel(value)} em relação ao mês anterior`;

  return <section className="finance-chart-card finance-flow-card">
    <div className="finance-dashboard-card-heading"><div><h2>Fluxo financeiro</h2><p>Recebimentos e pagamentos realizados · {snapshot.month.slice(0, 4)}</p></div><span className="finance-chart-period">Este ano</span></div>
    <div className="finance-recharts-flow" role="img" aria-label={`Fluxo financeiro de ${snapshot.month.slice(0, 4)}`}>
      <ResponsiveContainer width="100%" height={220} initialDimension={{ width: 820, height: 220 }}>
        <ComposedChart data={data} margin={{ top: 12, right: 8, left: 4, bottom: 2 }}>
          <defs><linearGradient id="finance-receivable-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#176b57" stopOpacity=".18"/><stop offset="100%" stopColor="#176b57" stopOpacity="0"/></linearGradient><linearGradient id="finance-payable-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d95540" stopOpacity=".12"/><stop offset="100%" stopColor="#d95540" stopOpacity="0"/></linearGradient></defs>
          <CartesianGrid vertical={false} stroke="#e7eeea" strokeDasharray="3 5"/>
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#84918f", fontSize: 10 }} interval="preserveStartEnd"/>
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#84918f", fontSize: 10 }} tickFormatter={compactMoney} width={58}/>
          <Tooltip content={FlowTooltip} cursor={{ stroke: "#9aa9a3", strokeDasharray: "4 4" }}/>
          <Area type="monotone" dataKey="receivable" name="Receitas" stroke="none" fill="url(#finance-receivable-fill)" isAnimationActive={false}/>
          <Area type="monotone" dataKey="payable" name="Despesas" stroke="none" fill="url(#finance-payable-fill)" isAnimationActive={false}/>
          <Line type="monotone" dataKey="payable" name="Despesas" stroke="#d95540" strokeWidth={2.5} dot={{ r: 3, fill: "#d95540", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} isAnimationActive={false}/>
          <Line type="monotone" dataKey="receivable" name="Receitas" stroke="#176b57" strokeWidth={2.5} dot={{ r: 3, fill: "#176b57", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} isAnimationActive={false}/>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
    <div className="finance-flow-legend"><span><i className="is-receivable"/><span><b>Receitas</b><strong>{money(current.receivable)}</strong><small>{trend(comparison("receivable"))}</small></span></span><span><i className="is-payable"/><span><b>Despesas</b><strong>{money(current.payable)}</strong><small>{trend(comparison("payable"))}</small></span></span></div>
  </section>;
}

function MonthlySummary({ snapshot }: { snapshot: FinanceSnapshot }) {
  const result = snapshot.totals.received - snapshot.totals.paid;
  return <section className={`finance-chart-card finance-result-card${result < 0 ? " is-negative" : ""}`}><h2>Resultado do mês</h2><p>Recebido menos pago</p><strong className={result < 0 ? "finance-coral" : "finance-green"}>{result >= 0 ? "+ " : "− "}{money(Math.abs(result))}</strong><dl><div><dt>Receitas</dt><dd>{money(snapshot.totals.received)}</dd></div><div><dt>Despesas</dt><dd>{money(snapshot.totals.paid)}</dd></div><div><dt>Resultado</dt><dd>{money(result)}</dd></div></dl></section>;
}

function ExpensesByCategory({ snapshot }: { snapshot: FinanceSnapshot }) {
  const expenses = snapshot.expenses.filter(item => item.value > 0).sort((a, b) => b.value - a.value);
  const leadingExpenses = expenses.slice(0, 4);
  const remainingValue = expenses.slice(4).reduce((sum, item) => sum + item.value, 0);
  const data = remainingValue > 0
    ? [...leadingExpenses, { id: "other-expenses", name: "Outros", value: remainingValue }]
    : leadingExpenses;
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const segmentGap = data.length > 1 ? 1.5 : 0;
  const availableAngle = 360 - segmentGap * data.length;
  const gradient = data.reduce<{ cursor: number; stops: string[] }>((state, item, index) => {
    const start = total ? index * segmentGap + state.cursor / total * availableAngle : 0;
    const end = total ? index * segmentGap + (state.cursor + item.value) / total * availableAngle : 0;
    const gap = segmentGap ? `, transparent ${end}deg ${end + segmentGap}deg` : "";
    return { cursor: state.cursor + item.value, stops: [...state.stops, `${chartColors[index % chartColors.length]} ${start}deg ${end}deg${gap}`] };
  }, { cursor: 0, stops: [] }).stops.join(", ");
  return <section className="finance-chart-card finance-expense-card">
    <div className="finance-dashboard-card-heading"><div><h2>Despesas por categoria</h2><p>Vencimentos no mês</p></div><span className="finance-chart-period">Este mês</span></div>
    {total ? <div className="finance-expense-content">
      <div className="finance-donut-wrap">
        <div className="finance-donut" style={{ backgroundImage: `conic-gradient(${gradient})` }} aria-label={`Despesas por categoria: ${money(total)}`} role="img">
          <div className="finance-donut-center"><span>Total</span><strong>{compactMoney(total)}</strong><small>no mês</small></div>
        </div>
      </div>
      <ul className="finance-legend-list" aria-label="Despesas por categoria">
        {data.map((item, index) => {
          const percentage = Math.round(item.value / total * 100);
          const color = chartColors[index % chartColors.length];
          return <li key={item.id}>
            <div className="finance-legend-row"><span className="finance-legend-name"><i style={{ background: color }}/><span title={item.name}>{item.name}</span></span><strong>{percentage}%</strong></div>
            <div className="finance-legend-meta"><span>{money(item.value)}</span><span>{percentage === 100 ? "Todas as despesas" : "do total"}</span></div>
            <span className="finance-legend-track"><span style={{ width: `${percentage}%`, background: color }}/></span>
          </li>;
        })}
      </ul>
    </div> : <div className="finance-chart-empty-note">Nenhuma despesa neste período.</div>}
  </section>;
}

function UpcomingPayments({ snapshot, onOpenEntries, onOpenEntry }: { snapshot: FinanceSnapshot; onOpenEntries: () => void; onOpenEntry: (id: string) => void }) {
  const upcoming = snapshot.entries.filter(entry => !entry.cancelledAt && entry.paidCents < entry.amountCents).slice(0, 4);
  return <section className="finance-chart-card finance-upcoming-card"><div className="finance-dashboard-card-heading"><div><h2>Próximos vencimentos</h2><p>Contas que merecem atenção</p></div><button type="button" className="finance-inline-action" onClick={onOpenEntries}>Ver todos</button></div>{upcoming.length ? <div className="finance-upcoming-list">{upcoming.map(entry => <button key={entry.id} type="button" className="finance-upcoming-item" onClick={()=>onOpenEntry(entry.id)} aria-label={`Abrir lançamento ${entry.description}`}><span className={`finance-upcoming-date ${entry.dueDate === snapshot.today ? "is-today" : ""}`}>{dueCaption(entry, snapshot.today)}</span><span className={`finance-upcoming-icon ${entry.type === "receivable" ? "is-receivable" : "is-payable"}`}><DueIcon type={entry.type}/></span><span className="finance-upcoming-description"><strong>{entry.companyName}</strong><small>{entry.type === "receivable" ? "Recebimento" : "Pagamento"} · {entry.description}</small></span><strong className={entry.type === "receivable" ? "finance-green" : "finance-coral"}>{entry.type === "receivable" ? "+ " : "− "}{money(entry.amountCents)}</strong></button>)}</div> : <p className="finance-empty">Nenhum vencimento neste período.</p>}</section>;
}

export function FinanceCharts({ snapshot, onOpenEntries, onOpenEntry }: { snapshot: FinanceSnapshot; onOpenEntries: () => void; onOpenEntry: (id: string) => void }) {
  return <div className="finance-overview-grid"><div className="finance-overview-main"><FlowChart snapshot={snapshot}/><UpcomingPayments snapshot={snapshot} onOpenEntries={onOpenEntries} onOpenEntry={onOpenEntry}/></div><aside className="finance-overview-side"><MonthlySummary snapshot={snapshot}/><ExpensesByCategory snapshot={snapshot}/></aside></div>;
}
