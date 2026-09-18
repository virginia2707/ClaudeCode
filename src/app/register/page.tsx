import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/auth-layout";
import { RegisterForm } from "@/components/auth/auth-forms";
import { redirectIfAuthenticated } from "@/actions/auth";
import { IconCheck } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function RegisterPage(props: PageProps<"/register">) {
  await redirectIfAuthenticated();
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  return (
    <AuthLayout
      title="Créer mon compte"
      subtitle="Gratuit, sans carte bancaire. Votre premier Escape Game en moins d'une heure."
      aside={
        <ul className="mt-8 space-y-2 text-sm text-text-muted">
          {["3 Escape Games et 10 sessions par mois offerts", "Démo « Mission Excel » incluse", "Vos apprenants rejoignent sans compte"].map((t) => (
            <li key={t} className="flex gap-2">
              <IconCheck size={16} className="mt-0.5 text-success" /> {t}
            </li>
          ))}
        </ul>
      }
    >
      <RegisterForm next={next} />
    </AuthLayout>
  );
}
