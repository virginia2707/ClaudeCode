import { Suspense } from "react";
import Link from "next/link";
import { RegisterForm } from "@/components/register-form";

export default function RegisterPage() {
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-xl font-semibold mb-1">
          THE <span className="text-accent">APPRENTICE</span>
        </h1>
        <p className="text-text-muted text-sm mb-6">Votre carrière commence maintenant.</p>

        <Suspense>
          <RegisterForm />
        </Suspense>

        <p className="text-sm text-text-muted mt-6 text-center">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-accent">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
