import { AuthForm } from "@/features/auth/components/auth-form";
export default async function Page({searchParams}:{searchParams:Promise<{invite?:string}>}) { return <AuthForm mode="recover" invite={(await searchParams).invite}/>; }
