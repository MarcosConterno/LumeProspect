import { AuthForm } from "@/features/auth/components/auth-form";
import { requireUser } from "@/features/auth/context";
export default async function Page() { await requireUser(); return <AuthForm mode="password" />; }
