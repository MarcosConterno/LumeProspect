import { getAccountIdentity } from "@/features/auth/context";
import { ProfileMenu } from "./profile-menu";

type AccountIdentity = Awaited<ReturnType<typeof getAccountIdentity>>;

export async function AccountMenu({ identity, context }: { identity?: AccountIdentity; context?: string } = {}) {
  const account = identity ?? await getAccountIdentity();
  const { name, email } = account;
  return <ProfileMenu name={name} email={email} context={context} />;
}

