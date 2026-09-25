export const navigation = [
  ["Visão geral", "/dashboard", "dashboard"],
  ["Favoritos", "/favoritos", "favoritos"],
  ["Clientes", "/clientes", "prospects"],
  ["Serviços", "/servicos", "servicos"],
  ["CRM", "/crm", "crm"],
  ["Financeiro", "/financeiro", "financeiro"],
  ["Agenda", "/agenda", "agenda"],
  ["Prospects", "/prospects", "prospects"],
  ["Configurações", "/configuracoes", "configuracoes"],
] as const;

const routeModules: Record<string,string> = {
  "/clientes":"crm", "/contatos":"crm", "/servicos":"crm", "/crm":"crm",
  "/financeiro":"financeiro", "/agenda":"agenda",
  "/buscar":"prospeccao", "/prospects":"prospeccao", "/favoritos":"prospeccao",
};
export const platformNavigation = [
  ["Ambientes", "/lume", "ambientes"],
  ...navigation,
] as const;
export function filteredNavigation(allowedModules: string[]) {
  return navigation.filter(([,href])=>!routeModules[href] || allowedModules.includes(routeModules[href]));
}
