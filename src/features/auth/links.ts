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

export function inviteFromDestination(value: unknown): string {
  const destination = authDestination(value);
  if (destination.startsWith("/convite/")) return validInvite(destination.slice("/convite/".length));
  return validInvite(destination.split("?invite=")[1]);
}

export function recoveryDestination(invite: unknown): string {
  const token = validInvite(invite);
  return "/redefinir-senha" + (token ? "?invite=" + token : "");
}
