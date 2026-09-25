export function authDestination(value: unknown): string {
  if (value === "/redefinir-senha" || value === "/onboarding") return value;
  // Links de recuperação emitidos antes da retirada dos convites continuam úteis.
  if (typeof value === "string" && /^\/redefinir-senha\?invite=[a-f0-9]{64}$/.test(value)) return "/redefinir-senha";
  return "/onboarding";
}
