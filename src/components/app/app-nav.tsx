"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { IconBuilding, IconChart, IconGrid, IconLayers, IconPlay, IconTarget, IconUsers } from "@/components/ui/icons";

const icons = {
  grid: IconGrid,
  layers: IconLayers,
  play: IconPlay,
  target: IconTarget,
  building: IconBuilding,
  chart: IconChart,
  users: IconUsers,
} as const;

export type NavItem = { href: string; label: string; icon: keyof typeof icons; exact?: boolean };

export function AppNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigation de l'application" className="px-2 pb-2 lg:px-3 lg:py-2 overflow-x-auto">
      <ul className="flex lg:flex-col gap-1">
        {items.map((it) => {
          const Icon = icons[it.icon];
          const active = it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <li key={it.href} className="flex-none">
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-accent-soft text-accent" : "text-text-muted hover:bg-surface-2 hover:text-text",
                )}
              >
                <Icon size={18} />
                <span className="whitespace-nowrap">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
