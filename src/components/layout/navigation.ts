export const navigation = [
  ["Visão geral", "/dashboard", "dashboard"],
  ["Clientes e empresas", "/clientes", "prospects"],
  ["Contatos", "/contatos", "prospects"],
  ["Serviços", "/servicos", "servicos"],
  ["CRM", "/crm", "crm"],
  ["Financeiro", "/financeiro", "financeiro"],
  ["Agenda", "/agenda", "agenda"],
  ["Buscar", "/buscar", "search"],
  ["Prospects", "/prospects", "prospects"],
  ["Favoritos", "/favoritos", "favoritos"],
] as const;

const routeModules: Record<string,string> = {
  "/clientes":"crm", "/contatos":"crm", "/servicos":"crm", "/crm":"crm",
  "/financeiro":"financeiro", "/agenda":"agenda",
  "/buscar":"prospeccao", "/prospects":"prospeccao", "/favoritos":"prospeccao",
};
export const platformNavigation = [
  ["Clientes e ambientes", "/lume", "prospects"],
  ["Masters", "/lume/masters", "configuracoes"],
  ...navigation,
] as const;
export function filteredNavigation(allowedModules: string[]) {
  return navigation.filter(([,href])=>!routeModules[href] || allowedModules.includes(routeModules[href]));
}
