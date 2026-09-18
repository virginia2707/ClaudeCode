import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export function AuthLayout({ title, subtitle, children, aside }: { title: string; subtitle: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <main id="contenu" className="flex-1 relative overflow-hidden">
      <div className="absolute inset-0 grid-bg" aria-hidden="true" />
      <div className="container-x relative py-10 sm:py-16 grid gap-10 lg:grid-cols-[1fr_minmax(0,28rem)] lg:items-center max-w-5xl">
        <div className="hidden lg:block">
          <Logo />
          <h2 className="mt-8 text-3xl font-semibold tracking-tight text-balance">Transformez vos formations en missions.</h2>
          <p className="mt-4 text-text-muted max-w-md">
            Créez des escape games pédagogiques, lancez une session en un clic et mesurez les compétences réellement acquises.
          </p>
          {aside}
        </div>
        <div className="card-glow p-6 sm:p-8">
          <div className="lg:hidden mb-6">
            <Logo />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-text-muted">{subtitle}</p>
          <div className="mt-6">{children}</div>
          <p className="mt-6 text-center text-xs text-text-subtle">
            <Link href="/" className="hover:text-accent">
              ← Retour à l&apos;accueil
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
