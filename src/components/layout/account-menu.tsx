import { getAccountIdentity } from "@/features/auth/context";
import { ProfileMenu } from "./profile-menu";

export async function AccountMenu() {
  const { name, email } = await getAccountIdentity();
  return <ProfileMenu name={name} email={email} />;
}

