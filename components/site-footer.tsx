import Link from "@/components/link";
import { common } from "@/lib/i18n/messages/common";
import { getMessages } from "@/lib/i18n/server";

export async function SiteFooter() {
  const t = (await getMessages(common)).footer;
  return (
    <footer className="clay foot">
      <div className="cols">
        <div className="brand">
          <Link className="logo disp" href="/">
            <i className="clay s" aria-hidden="true"></i>stand-by
          </Link>
          <p>{t.tagline}</p>
        </div>
        <div>
          <h2>{t.platform}</h2>
          <ul>
            <li><Link href="/">{t.home}</Link></li>
            <li><Link href="/reserver">{t.book}</Link></li>
            <li><Link href="/entreprise">{t.companySpace}</Link></li>
            <li><Link href="/commercial">{t.freelancerSpace}</Link></li>
            <li><Link href="/comptes">{t.createAccount}</Link></li>
          </ul>
        </div>
        <div>
          <h2>{t.resources}</h2>
          <ul>
            <li><Link href="/aide">{t.help}</Link></li>
            <li><Link href="/contact">{t.contact}</Link></li>
            <li><Link href="/plan-du-site">{t.sitemap}</Link></li>
            <li><Link href="/accessibilite">{t.accessibility}</Link></li>
            <li><Link href="/compte">{t.account}</Link></li>
          </ul>
        </div>
        <div>
          <h2>{t.legal}</h2>
          <ul>
            <li><Link href="/mentions-legales">{t.notice}</Link></li>
            <li><Link href="/cgu">{t.terms}</Link></li>
            <li><Link href="/cgv">{t.sales}</Link></li>
            <li><Link href="/mandat-facturation">{t.mandate}</Link></li>
            <li><Link href="/confidentialite">{t.privacy}</Link></li>
            <li><Link href="/cookies">{t.cookies}</Link></li>
          </ul>
        </div>
      </div>
      <div className="bar">
        <span>© {new Date().getFullYear()} Stand-By. {t.rights}</span>
        <nav aria-label={t.legalLinks}>
          <Link href="/mentions-legales">{t.notice}</Link>
          <Link href="/confidentialite">{t.privacyShort}</Link>
          <Link href="/cookies">{t.cookiesShort}</Link>
          <Link href="/accessibilite">{t.accessibilityStatus}</Link>
        </nav>
      </div>
    </footer>
  );
}
