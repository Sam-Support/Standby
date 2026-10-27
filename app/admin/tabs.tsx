"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  ["/admin", "Tableau de bord"],
  ["/admin/salons", "Salons et foires"],
  ["/admin/tarification", "Tarification"],
  ["/admin/inscrits", "Inscrits"],
  ["/admin/reservations", "Réservations"],
  ["/admin/finances", "Finances"],
  ["/admin/cartes", "Cartes de visite"],
  ["/admin/messages", "Messages"],
];

export function AdminTabs() {
  const p = usePathname();
  return (
    <nav className="seg sunk" aria-label="Administration" style={{ overflowX: "auto", flexWrap: "nowrap" }}>
      {TABS.map(([href, label]) => {
        const on = href === "/admin" ? p === "/admin" : p.startsWith(href);
        return (
          <Link key={href} href={href} className={on ? "on" : ""} aria-current={on ? "page" : undefined} style={{ whiteSpace: "nowrap" }}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
