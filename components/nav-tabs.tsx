"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Accueil", match: (p: string) => p === "/" },
  { href: "/reserver", label: "Réserver", match: (p: string) => p.startsWith("/reserver") },
  { href: "/entreprise", label: "Entreprise", match: (p: string) => p.startsWith("/entreprise") },
  { href: "/commercial", label: "Commercial", match: (p: string) => p.startsWith("/commercial") },
];

export function NavTabs({ admin }: { admin: boolean }) {
  const pathname = usePathname();
  const tabs = admin ? [...TABS, { href: "/admin", label: "Admin", match: (p: string) => p.startsWith("/admin") }] : TABS;
  return (
    <div className="tabs sunk">
      {tabs.map((t) => {
        const on = t.match(pathname);
        return (
          <Link key={t.href} href={t.href} className={on ? "tab on clay s" : "tab"} aria-current={on ? "page" : undefined}>
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
