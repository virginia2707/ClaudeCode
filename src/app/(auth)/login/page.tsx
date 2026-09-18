import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { Card } from "@/components/ui/card";
import { safeNext } from "@/lib/auth/schemas";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined, "");
  return (
    <Card variant="elevated" className="w-full max-w-md p-6 sm:p-8">
      <p className="eyebrow">Connexion</p>
      <h1 className="h2 mt-2">Reprenez votre mission.</h1>
      <p className="mt-2 text-sm text-text-secondary">Formateur, apprenant ou administrateur : un seul accès.</p>
      <div className="mt-6">
        <LoginForm next={next || undefined} />
      </div>
    </Card>
  );
}
