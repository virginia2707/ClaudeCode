import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Créer un compte", robots: { index: false } };

export default function RegisterPage() {
  return (
    <Card variant="elevated" className="w-full max-w-lg p-6 sm:p-8">
      <p className="eyebrow">Inscription</p>
      <h1 className="h2 mt-2">Créez votre compte MissionIA.</h1>
      <p className="mt-2 text-sm text-text-secondary">Gratuit pour démarrer : 3 missions, sessions illimitées.</p>
      <div className="mt-6">
        <RegisterForm />
      </div>
    </Card>
  );
}
