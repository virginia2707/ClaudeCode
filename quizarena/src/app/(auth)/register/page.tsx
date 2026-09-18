import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/auth-forms";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getCurrentUser();
  const { next } = await searchParams;
  if (user) redirect(user.role === "LEARNER" ? "/profile" : "/dashboard");
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Créer un compte</h1>
      <p className="mt-1 mb-6 text-sm text-text-muted">Gratuit. Les apprenants n&apos;ont pas besoin de compte pour jouer.</p>
      <RegisterForm next={next} />
    </>
  );
}
