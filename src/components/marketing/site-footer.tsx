import Link from "next/link";
import { Logo } from "@/components/ui/logo";

const COLUMNS = [
  {
    title: "Produit",
    links: [
      { href: "/#comment-ca-marche", label: "Comment ça marche" },
      { href: "/#ia", label: "Génération par IA" },
      { href: "/#competences", label: "Compétences" },
      { href: "/#tarifs", label: "Tarifs" },
      { href: "/demo", label: "Mission démo" },
    ],
  },
  {
    title: "Pour qui",
    links: [
      { href: "/#formateurs", label: "Formateurs indépendants" },
      { href: "/#organismes", label: "Organismes de formation" },
      { href: "/#organismes", label: "Écoles et universités" },
      { href: "/#organismes", label: "Entreprises" },
    ],
  },
  {
    title: "Ressources",
    links: [
      { href: "/#faq", label: "FAQ" },
      { href: "/design-system", label: "Design system" },
      { href: "/#exemple", label: "Exemple de mission" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-bg-elevated">
      <div className="container-x grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm text-text-muted">
            Parcours pédagogiques professionnels sous forme de missions. Le formateur reste aux commandes, l&apos;IA
            accélère.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="mb-3 text-sm font-semibold text-text">{col.title}</p>
            <ul className="space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-text-muted hover:text-text">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="container-x flex flex-col gap-2 py-5 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} MissionIA. Tous droits réservés.</p>
          <p>Pédagogie &gt; gamification · Compétences &gt; score · Formateur aux commandes &gt; IA autonome.</p>
        </div>
      </div>
    </footer>
  );
}
