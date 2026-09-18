import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/auth-forms";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getCurrentUser();
  const { next } = await searchParams;
  if (user) redirect(user.role === "LEARNER" ? "/profile" : "/dashboard");
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Bon retour dans l&apos;arène</h1>
      <p className="mt-1 mb-6 text-sm text-text-muted">Connectez-vous pour gérer vos quiz et vos parties.</p>
      <LoginForm next={next} />
    </>
  );
}
