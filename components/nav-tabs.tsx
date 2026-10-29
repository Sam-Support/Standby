"use client";

import Link from "@/components/link";
import { usePathname } from "next/navigation";
import { splitLang } from "@/lib/i18n/config";
import { common } from "@/lib/i18n/messages/common";
import { useMessages } from "./i18n";

export function NavTabs({ admin }: { admin: boolean }) {
  const { path } = splitLang(usePathname() || "/");
  const t = useMessages(common).nav;
  const tabs = [
    { href: "/", label: t.home, on: path === "/" },
    { href: "/reserver", label: t.book, on: path.startsWith("/reserver") },
    { href: "/entreprise", label: t.company, on: path.startsWith("/entreprise") },
    { href: "/commercial", label: t.freelancer, on: path.startsWith("/commercial") },
    ...(admin ? [{ href: "/admin", label: t.admin, on: path.startsWith("/admin") }] : []),
  ];
  return (
    <div className="tabs sunk">
      {tabs.map((tab) => (
        <Link key={tab.href} href={tab.href} className={tab.on ? "tab on clay s" : "tab"} aria-current={tab.on ? "page" : undefined}>
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
