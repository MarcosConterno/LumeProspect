export function validInvite(value: unknown): string {
  return typeof value==="string" && /^[a-f0-9]{64}$/.test(value) ? value : "";
}

export function authDestination(value: unknown): string {
  if(value==="/redefinir-senha" || value==="/onboarding") return value;
  if(typeof value==="string" && (/^\/convite\/[a-f0-9]{64}$/.test(value) || /^\/redefinir-senha\?invite=[a-f0-9]{64}$/.test(value))) return value;
  return "/onboarding";
}

export function invitationDestination(invite: unknown) {
  const token=validInvite(invite);
  return token ? "/convite/"+token : "/onboarding";
}
