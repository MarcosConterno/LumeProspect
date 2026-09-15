import { AuthForm } from "@/features/auth/components/auth-form";
export default async function Page({searchParams}:{searchParams:Promise<{invite?:string}>}) {
  return <AuthForm mode="resend" invite={(await searchParams).invite}/>;
}
