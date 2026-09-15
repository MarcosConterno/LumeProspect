import type { EntryInput, FinanceFilters } from "../types";
export function uuid(value: string) {
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new Error("Selecione um cadastro válido.");
  return value;
}
export function date(value: string) {
  if(!/^(19|20|21)\d{2}-\d{2}-\d{2}$/.test(value)||value<"1900-01-01"||value>"2100-12-31") throw new Error("Informe uma data válida entre 1900 e 2100.");
  const parsed=new Date(value+"T12:00:00Z");
  if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==value) throw new Error("Informe uma data válida.");
  return value;
}
export function cents(value: number) {
  if(!Number.isSafeInteger(value)||value<1||value>999999999999) throw new Error("Informe um valor positivo de até R$ 9.999.999.999,99.");
  return value;
}
export function parseAmount(value: string) {
  const normalized=value.trim().replace(",",".");
  if(!/^\d{1,10}(\.\d{1,2})?$/.test(normalized)) throw new Error("Informe o valor sem separador de milhar e com até duas casas decimais.");
  const [whole,fraction=""]=normalized.split(".");
  return cents(Number(whole)*100+Number(fraction.padEnd(2,"0")));
}
export function text(value: string, min: number, max: number) {
  const result=value.trim();
  if(result.length<min||result.length>max) throw new Error("Confira os campos obrigatórios e o tamanho do texto.");
  return result;
}
export function version(value: number) {
  if(!Number.isSafeInteger(value)||value<1) throw new Error("Recarregue o registro antes de salvar.");
  return value;
}
export function validateEntry(input: EntryInput): EntryInput {
  if(!["receivable","payable"].includes(input.type)) throw new Error("Tipo de lançamento inválido.");
  return {...input,id:uuid(input.id),version:input.version===undefined?undefined:version(input.version),companyId:uuid(input.companyId),categoryId:uuid(input.categoryId),
    description:text(input.description,2,160),notes:text(input.notes,0,4000),dueDate:date(input.dueDate),amountCents:cents(input.amountCents)};
}
export function validateFilters(input: FinanceFilters): FinanceFilters {
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.month)) throw new Error("Selecione um mês válido.");
  date(input.month+"-01");
  if(!["all","receivable","payable"].includes(input.type)||!["all","open","overdue","partial","settled","cancelled"].includes(input.status)) throw new Error("Filtro inválido.");
  if(!Number.isSafeInteger(input.page)||input.page<1||input.page>1000000) throw new Error("Página inválida.");
  return {...input,query:text(input.query,0,150)};
}

