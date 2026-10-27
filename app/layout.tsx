import type { Metadata } from "next";
import { Jost, Onest } from "next/font/google";
import { CookieBanner } from "@/components/cookie-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

const onest = Onest({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-onest" });
const jost = Jost({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-jost" });

export const metadata: Metadata = {
  title: { default: "Standby · Staffez vos stands de salons et foires", template: "%s · Standby" },
  description:
    "Commerciaux, hôtes·ses, animateurs et interprètes vérifiés pour vos salons professionnels et vos foires. Brief, leads au format de votre CRM, validation des heures et paie gérées pour vous.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${onest.variable} ${jost.variable}`}>
      <body>
        <a className="skip" href="#contenu">
          Aller au contenu
        </a>
        <div className="wrap">
          <SiteNav />
          <main id="contenu" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {children}
          </main>
          <SiteFooter />
        </div>
        <CookieBanner />
      </body>
    </html>
  );
}
