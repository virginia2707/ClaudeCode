import type { Metadata } from "next";
import { Logo } from "@/components/ui/logo";
import { JoinCodeForm } from "@/components/play/join-form";
import Link from "next/link";

export const metadata: Metadata = { title: "Rejoindre une mission" };

export default async function JoinPage(props: PageProps<"/join">) {
  const sp = await props.searchParams;
  const initialCode = typeof sp.code === "string" ? sp.code : "";
  return (
    <main id="contenu" className="flex-1 relative overflow-hidden flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 grid-bg" aria-hidden="true" />
      <div className="relative w-full max-w-md card-glow p-6 sm:p-8 text-center">
        <Logo className="justify-center" />
        <p className="mt-6 font-mono text-xs tracking-[0.25em] text-accent">JOIN ESCAPECLASS</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Rejoindre une mission</h1>
        <p className="mt-1.5 text-sm text-text-muted">Entrez le code affiché par votre formateur.</p>
        <div className="mt-6 text-left">
          <JoinCodeForm initialCode={initialCode} />
        </div>
        <p className="mt-6 text-xs text-text-subtle">
          Vous êtes formateur ?{" "}
          <Link href="/login" className="text-accent underline-offset-4 hover:underline">
            Connexion
          </Link>
        </p>
      </div>
    </main>
  );
}
