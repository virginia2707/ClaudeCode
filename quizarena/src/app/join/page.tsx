import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

// Phase 1 placeholder — replaced by the real join form in Phase 5.
export default function JoinPage() {
  return (
    <>
      <SiteHeader user={null} />
      <main id="main" className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-3xl font-bold">Rejoindre une partie</h1>
        <p className="mt-3 text-text-muted">La saisie de code arrive dans la phase suivante.</p>
      </main>
      <SiteFooter />
    </>
  );
}
