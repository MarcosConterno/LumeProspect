import { CrmIcon } from "@/features/crm/components/crm-icon";

type CrmFiltersProps = {
  stage: string;
  service: string;
  owner: string;
  sort: string;
  value: string;
  closing: string;
  attention: string;
  onChange: (key: "stage" | "service" | "owner" | "sort" | "value" | "closing" | "attention", value: string) => void;
  onNewDeal: () => void;
};

const filterClass = "crm-filter min-w-0";

export function CrmFilters({ stage, service, owner, sort, value, closing, attention, onChange, onNewDeal }: CrmFiltersProps) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <div className="crm-toolbar flex flex-wrap items-center gap-2">
        <select aria-label="Filtrar por responsável" value={owner} onChange={(event) => onChange("owner", event.target.value)} className={filterClass}>
          <option value="all">Todos os responsáveis</option>
          <option value="João Silva">João Silva</option>
          <option value="Marina Costa">Marina Costa</option>
        </select>
        <select aria-label="Filtrar por etapa" value={stage} onChange={(event) => onChange("stage", event.target.value)} className={filterClass}>
          <option value="all">Etapa</option>
          <option value="new">Novo</option>
          <option value="contacted">Contato iniciado</option>
          <option value="diagnosis">Reunião / Diagnóstico</option>
          <option value="proposal">Proposta enviada</option>
          <option value="negotiation">Negociação</option>
        </select>
        <select aria-label="Filtrar por serviço" value={service} onChange={(event) => onChange("service", event.target.value)} className={filterClass}>
          <option value="all">Serviço</option>
          <option>Branding</option>
          <option>Consultoria</option>
          <option>Tráfego Pago</option>
          <option>Performance</option>
          <option>Growth</option>
        </select>
        <label className={filterClass}><span className="font-mono">R$</span><span className="sr-only">Filtrar por valor</span><select aria-label="Filtrar por valor" value={value} onChange={(event) => onChange("value", event.target.value)} className="crm-filter-select"><option value="all">Valor</option><option value="small">Até R$ 5 mil</option><option value="medium">R$ 5–10 mil</option><option value="large">Acima de R$ 10 mil</option></select></label>
        <label className={filterClass}><CrmIcon name="calendar" /><span className="sr-only">Filtrar por fechamento</span><select aria-label="Filtrar por fechamento" value={closing} onChange={(event) => onChange("closing", event.target.value)} className="crm-filter-select"><option value="all">Fechamento</option><option value="month">Setembro 2026</option></select></label>
        <label className={filterClass}><span aria-hidden="true">☷</span><span className="sr-only">Mais filtros</span><select aria-label="Mais filtros" value={attention} onChange={(event) => onChange("attention", event.target.value)} className="crm-filter-select"><option value="all">Mais filtros</option><option value="attention">Precisam de atenção</option></select></label>
        <select aria-label="Ordenar negócios" value={sort} onChange={(event) => onChange("sort", event.target.value)} className={`${filterClass} lg:ml-auto`}>
          <option value="activity">Ordenar: Próxima atividade</option>
          <option value="score">Ordenar: Maior score</option>
          <option value="value">Ordenar: Maior valor</option>
        </select>
        <button type="button" onClick={onNewDeal} className="shrink-0 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-dark)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          + Novo negócio
        </button>
      </div>
    </div>
  );
}
