export const roleLabels: Record<string, string> = {
  owner: "Proprietário", admin: "Administrador", manager: "Gerente", member: "Usuário", master: "Master Lume",
};
export function managesUsers(role: string) {
  return ["owner", "admin", "manager"].includes(role);
}
export function assignableRoles(role: string) {
  return role === "manager" ? ["member"] : ["member", "manager", "admin"];
}
