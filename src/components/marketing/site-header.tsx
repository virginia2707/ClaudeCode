"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Logo } from "@/components/ui/logo";

const NAV = [
  { href: "/#comment-ca-marche", label: "Comment ça marche" },
  { href: "/#formateurs", label: "Formateurs" },
  { href: "/#organismes", label: "Organismes" },
  { href: "/#ia", label: "L'IA" },
  { href: "/#tarifs", label: "Tarifs" },
  { href: "/demo", label: "Démo" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Navigation principale" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="btn btn-ghost btn-sm font-medium">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <ButtonLink href="/login" variant="ghost" size="sm">
            Connexion
          </ButtonLink>
          <ButtonLink href="/register" size="sm">
            Créer ma première mission
          </ButtonLink>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm lg:hidden"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? "close" : "menu"} className="h-5 w-5" />
          <span className="sr-only">{open ? "Fermer le menu" : "Ouvrir le menu"}</span>
        </button>
      </div>
      {open && (
        <nav id={menuId} aria-label="Navigation mobile" className="border-t border-border bg-bg-elevated lg:hidden">
          <ul className="container-x flex flex-col py-3">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} onClick={() => setOpen(false)} className="block rounded-md px-3 py-3 text-text-secondary hover:bg-surface-2 hover:text-text">
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="mt-2 flex flex-col gap-2 px-3 pb-2">
              <ButtonLink href="/login" variant="secondary" onClick={() => setOpen(false)}>
                Connexion
              </ButtonLink>
              <ButtonLink href="/register" onClick={() => setOpen(false)}>
                Créer ma première mission
              </ButtonLink>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
