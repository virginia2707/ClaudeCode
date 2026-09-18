"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/ui/logo";
import { ButtonLink } from "@/components/ui/button";
import { IconClose, IconMenu } from "@/components/ui/icons";

const links = [
  { href: "/#comment-ca-marche", label: "Comment ça marche" },
  { href: "/#fonctionnalites", label: "Fonctionnalités" },
  { href: "/#exemple", label: "Exemple" },
  { href: "/#tarifs", label: "Tarifs" },
  { href: "/#faq", label: "FAQ" },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-bg/80 backdrop-blur">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Navigation principale" className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="btn btn-ghost btn-sm text-text-muted hover:text-text">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-2">
          <ButtonLink href="/join" variant="ghost" size="sm">
            J&apos;ai un code
          </ButtonLink>
          <ButtonLink href="/login" variant="secondary" size="sm">
            Connexion
          </ButtonLink>
          <ButtonLink href="/register" size="sm">
            Créer mon Escape Game
          </ButtonLink>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <IconClose /> : <IconMenu />}
          <span className="sr-only">{open ? "Fermer le menu" : "Ouvrir le menu"}</span>
        </button>
      </div>
      {open ? (
        <div id="mobile-menu" className="md:hidden border-t border-border bg-bg-elevated">
          <nav aria-label="Navigation mobile" className="container-x flex flex-col gap-1 py-3">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="btn btn-ghost justify-start">
                {l.label}
              </Link>
            ))}
            <div className="divider my-2" />
            <ButtonLink href="/join" variant="ghost" className="justify-start">
              J&apos;ai un code de session
            </ButtonLink>
            <ButtonLink href="/login" variant="secondary">
              Connexion
            </ButtonLink>
            <ButtonLink href="/register">Créer mon Escape Game</ButtonLink>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
