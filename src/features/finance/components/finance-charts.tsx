import { money, monthNames } from "../format";
import type { FinanceSnapshot } from "../types";
const palette=["#2f7d62","#b8862e","#b8503e","#737880","#a6bcae"];

export function FinanceCharts({snapshot}:{snapshot:FinanceSnapshot}) {
  const values=snapshot.monthly.map(item=>item.value);
  const min=Math.min(0,...values),max=Math.max(100,...values),range=max-min;
  const y=(value:number)=>140-(value-min)/range*112;
  const points=values.map((value,index)=>[38+index*23,y(value)]);
  const path=points.map(([x,y],index)=>(index ? "L" : "M")+x+","+y).join(" ");
  const year=snapshot.month.slice(0,4);
  const total=snapshot.expenses.reduce((sum,item)=>sum+item.value,0);
  const stops=snapshot.expenses.map((item,index)=>{
    const start=snapshot.expenses.slice(0,index).reduce((sum,previous)=>sum+previous.value,0)/total*100;
    return palette[index%palette.length]+" "+start+"% "+(start+item.value/total*100)+"%";
  }).join(",");
  const net=snapshot.totals.received-snapshot.totals.paid;
  return <aside className="finance-charts" aria-label="Gráficos financeiros">
    <section className="finance-chart-card"><h2>Evolução do resultado</h2><p>Recebido − pago · data da baixa · {year}</p>
      <svg viewBox="0 0 320 174" role="img" aria-label={"Resultado mensal realizado em "+year+". Consulte os valores na tabela abaixo."}>
        {[min,min+range/2,max].map((value,index)=><g key={index}><line x1="38" x2="298" y1={y(value)} y2={y(value)} stroke="#e7e5e0" strokeDasharray="3 4"/><text x="31" y={y(value)+3} textAnchor="end" fontSize="9" fill="#5b5f66">{(value/100000).toLocaleString("pt-BR",{maximumFractionDigits:1})} mil</text></g>)}
        <path d={path+" L291,"+y(0)+" L38,"+y(0)+" Z"} fill="#eaf3ee"/><path d={path} fill="none" stroke="#2f7d62" strokeWidth="2" strokeLinejoin="round"/>
        {points.map(([x,y],index)=><g key={index}><circle cx={x} cy={y} r="3" fill="white" stroke="#2f7d62"><title>{monthNames[index]+": "+money(values[index])}</title></circle>{index%2===0 && <text x={x} y="162" textAnchor="middle" fontSize="9" fill="#5b5f66">{monthNames[index].slice(0,3)}</text>}</g>)}
      </svg>
      <details className="finance-chart-data"><summary>Ver valores por mês</summary><table><caption className="sr-only">Resultado mensal de {year}</caption><tbody>{values.map((value,index)=><tr key={index}><th scope="row">{monthNames[index]}</th><td>{money(value)}</td></tr>)}</tbody></table></details>
    </section>
    <section className="finance-chart-card"><h2>Despesas por categoria</h2><p>Pagas e previstas · vencimento no mês</p>{total>0 ? <><div className="finance-donut" style={{background:"conic-gradient("+stops+")"}} aria-hidden="true"><div><strong>{money(total)}</strong><span>Total do mês</span></div></div><ul className="finance-legend">{snapshot.expenses.map((item,index)=><li key={item.id}><span className="finance-legend-dot" style={{background:palette[index%palette.length]}} aria-hidden="true"/><span>{item.name}</span><strong>{money(item.value)}</strong></li>)}</ul></> : <p className="finance-empty">Nenhuma despesa neste período.</p>}</section>
    <section className="finance-chart-card finance-period-summary"><h2>Resultado do período</h2><p>Recebido menos pago</p><strong className={net<0 ? "finance-coral" : "finance-green"}>{money(net)}</strong><small>Baixas efetivas no mês, descontados os estornos. Não representa saldo bancário.</small></section>
  </aside>;
}
