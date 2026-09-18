import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginForm } from "@/components/auth/auth-forms";
import { redirectIfAuthenticated } from "@/actions/auth";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage(props: PageProps<"/login">) {
  await redirectIfAuthenticated();
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  return (
    <AuthLayout title="Connexion" subtitle="Accédez à vos Escape Games, sessions et statistiques.">
      <LoginForm next={next} />
    </AuthLayout>
  );
}
