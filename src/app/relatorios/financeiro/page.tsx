import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { loadFinanceReport, todayInSaoPaulo } from "@/features/finance/data/repository";
import { financeFiltersFromParams, uuid } from "@/features/finance/data/validation";
import { dateLabel, entryStatus, money } from "@/features/finance/format";
import { financeFilterSummary } from "@/features/finance/search";
import { PrintReportButton } from "@/features/finance/components/print-report-button";
import "@/features/finance/report.css";

export const metadata: Metadata = {title:"Relatório financeiro",robots:{index:false,follow:false}};

export default async function FinanceReportPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  let report: Awaited<ReturnType<typeof loadFinanceReport>> | null = null;
  let message="Não foi possível gerar o relatório.";
  try {
    const params=await searchParams;
    if(typeof params.workspace!=="string") throw new Error("Abra o relatório pela busca do financeiro.");
    const filters=financeFiltersFromParams(params,todayInSaoPaulo().slice(0,7));
    report=await loadFinanceReport(uuid(params.workspace),filters);
  } catch(error) {
    unstable_rethrow(error);
    if(error instanceof Error) message=error.message;
  }
  if(!report) return <main className="finance-report"><h1>Relatório indisponível</h1><p role="alert">{message}</p><Link href="/financeiro">Voltar ao financeiro</Link></main>;

  const {search,filters}=report;
  const totals=[
    ["A receber",search.totals.receivable],["A pagar",search.totals.payable],
    ["Recebido nos títulos",search.totals.received],["Pago nos títulos",search.totals.paid],
  ] as const;

  return <main className="finance-report">
    <nav className="finance-report-toolbar" aria-label="Ações do relatório">
      <Link href="/financeiro">Voltar ao financeiro</Link><PrintReportButton/>
      <p>Na impressão, escolha “Salvar como PDF” ou sua impressora. Todos os resultados dos filtros estão abaixo.</p>
    </nav>
    <header className="finance-report-heading">
      <div><p className="finance-report-brand">LUME · FINANCEIRO</p><h1>Relatório de lançamentos</h1><h2>{report.companyName}</h2></div>
      <p>Emitido em {new Date(report.issuedAt).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})}<br/>Horário de Brasília · BRL</p>
    </header>
    <section className="finance-report-filters" aria-label="Filtros aplicados">
      <h2>Critérios da consulta</h2>
      <ul>{financeFilterSummary(filters,search).map(item=><li key={item}>{item}</li>)}</ul>
    </section>
    <section className="finance-report-totals" aria-label="Totais dos resultados">
      {totals.map(([label,value])=><div key={label}><span>{label}</span><strong>{money(value)}</strong></div>)}
    </section>
    <p className="finance-report-note">{search.count} lançamento(s). Totais de todos os resultados, sem cancelados. Recebido e pago representam as baixas acumuladas desses títulos, descontados os estornos, independentemente da data da baixa. Não representam saldo bancário.</p>
    <table className="finance-report-table">
      <caption>Lançamentos por vencimento · {dateLabel(search.dateFrom)} a {dateLabel(search.dateTo)}</caption>
      <colgroup><col className="report-description"/><col className="report-company"/><col className="report-category"/><col className="report-date"/><col className="report-status"/><col className="report-value"/><col className="report-value"/><col className="report-value"/></colgroup>
      <thead><tr><th scope="col">Descrição / tipo</th><th scope="col">Cliente / fornecedor</th><th scope="col">Categoria</th><th scope="col">Vencimento</th><th scope="col">Situação</th><th scope="col">Valor</th><th scope="col">Baixado</th><th scope="col">Em aberto</th></tr></thead>
      <tbody>{search.entries.map(entry=><tr key={entry.id}>
        <td><strong>{entry.description}</strong><small>{entry.type==="receivable" ? "A receber" : "A pagar"}</small></td>
        <td>{entry.companyName}</td><td>{entry.categoryName}</td><td>{dateLabel(entry.dueDate)}</td>
        <td>{entryStatus(entry,search.today)}</td><td>{money(entry.amountCents)}</td><td>{money(entry.paidCents)}</td><td>{money(entry.cancelledAt ? 0 : entry.amountCents-entry.paidCents)}</td>
      </tr>)}</tbody>
    </table>
    {!search.entries.length && <p className="finance-report-empty">Nenhum lançamento corresponde aos filtros selecionados.</p>}
    <footer className="finance-report-footer">Fim do relatório · {search.count} lançamento(s) · {report.companyName}</footer>
  </main>;
}
