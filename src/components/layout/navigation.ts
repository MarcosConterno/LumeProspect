export const navigation = [
  ["Clientes", "/clientes", "prospects"],
  ["CRM", "/crm", "crm"],
  ["Financeiro", "/financeiro", "financeiro"],
  ["Agenda", "/agenda", "agenda"],
  ["Configurações", "/configuracoes", "configuracoes"],
] as const;

const routeModules: Record<string,string> = {
  "/clientes":"crm", "/contatos":"crm", "/crm":"crm",
  "/financeiro":"financeiro", "/agenda":"agenda",
};
export const platformNavigation = [
  ["Ambientes", "/lume", "ambientes"],
  ...navigation,
] as const;
export function filteredNavigation(allowedModules: string[]) {
  return navigation.filter(([,href])=>!routeModules[href] || allowedModules.includes(routeModules[href]));
}
