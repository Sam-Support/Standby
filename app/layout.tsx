import type { Metadata } from "next";
import { Jost, Onest } from "next/font/google";
import { CookieBanner } from "@/components/cookie-banner";
import { FlashRegion } from "@/components/flash";
import { LangProvider } from "@/components/i18n";
import { common } from "@/lib/i18n/messages/common";
import { home } from "@/lib/i18n/messages/home";
import { getLang, getMessages } from "@/lib/i18n/server";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { VerifyBanner } from "@/components/verify-banner";
import "./globals.css";

const onest = Onest({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-onest" });
const jost = Jost({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-jost" });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(home);
  return { title: { default: t.title, template: "%s · Standby" }, description: t.description };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const lang = await getLang();
  return (
    <html lang={lang} className={`${onest.variable} ${jost.variable}`}>
      <body>
        <LangProvider lang={lang}>
        <a className="skip" href="#contenu">
          {(await getMessages(common)).skip}
        </a>
        <div className="wrap">
          <SiteNav />
          <main id="contenu" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <VerifyBanner />
            {children}
          </main>
          <SiteFooter />
        </div>
        <FlashRegion />
        <CookieBanner />
        </LangProvider>
      </body>
    </html>
  );
}
