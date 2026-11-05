"use client";

import Link from "@/components/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { splitLang } from "@/lib/i18n/config";
import { common } from "@/lib/i18n/messages/common";
import { useMessages } from "./i18n";

export function NavTabs({ admin }: { admin: boolean }) {
  const { path } = splitLang(usePathname() || "/");
  const t = useMessages(common).nav;
  const bar = useRef<HTMLDivElement>(null);
  // sur petit écran les onglets défilent : l'onglet de la page courante reste visible
  useEffect(() => {
    const on = bar.current?.querySelector<HTMLElement>("[aria-current=page]");
    if (on && bar.current && bar.current.scrollWidth > bar.current.clientWidth) {
      bar.current.scrollLeft = on.offsetLeft - (bar.current.clientWidth - on.offsetWidth) / 2;
    }
  }, [path]);
  const tabs = [
    { href: "/", label: t.home, on: path === "/" },
    { href: "/reserver", label: t.book, on: path.startsWith("/reserver") },
    { href: "/entreprise", label: t.company, on: path.startsWith("/entreprise") },
    { href: "/commercial", label: t.freelancer, on: path.startsWith("/commercial") },
    ...(admin ? [{ href: "/admin", label: t.admin, on: path.startsWith("/admin") }] : []),
  ];
  return (
    <div className="tabs sunk" ref={bar}>
      {tabs.map((tab) => (
        <Link key={tab.href} href={tab.href} className={tab.on ? "tab on clay s" : "tab"} aria-current={tab.on ? "page" : undefined}>
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
