import { AuthForm } from "@/features/auth/components/auth-form";
import { requireUser } from "@/features/auth/context";
export default async function Page({searchParams}:{searchParams:Promise<{invite?:string}>}) { await requireUser(); return <AuthForm mode="password" invite={(await searchParams).invite}/>; }
