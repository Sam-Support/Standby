import Link from "@/components/link";
import { getDb } from "@/db";
import { BackLink, PageHead, Status } from "@/components/ui";
import { requireFreelancer } from "@/lib/auth/session";
import { freelancer as messages } from "@/lib/i18n/messages/freelancer";
import { translateInvoiceText } from "@/lib/i18n/messages/invoice";
import { getFmt, getMessages } from "@/lib/i18n/server";
import { payoutMonth, selfBillsFor, totals, type SelfBillRow } from "@/lib/services/self-billing";

export async function generateMetadata() {
  return { title: (await getMessages(messages)).earnings.title };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ annee?: string }> }) {
  const { annee } = await searchParams;
  const f = await requireFreelancer("/commercial/revenus");
  const rows = await selfBillsFor(await getDb(), f.id);
  const years = [...new Set(rows.map((r) => r.p.scheduledFor.slice(0, 4)))].sort().reverse();
  const year = annee && years.includes(annee) ? annee : (years[0] ?? String(new Date().getFullYear()));
  const mine = rows.filter((r) => r.p.scheduledFor.startsWith(year));
  const months = new Map<string, SelfBillRow[]>();
  for (const r of mine) months.set(payoutMonth(r), [...(months.get(payoutMonth(r)) ?? []), r]);
  const sum = totals(mine);
  const all = await getMessages(messages);
  const t = all.earnings;
  const fm = await getFmt();

  return (
    <>
      <BackLink href="/commercial">{all.area}</BackLink>
      <PageHead label={all.area} title={t.title}>
        {t.leadBefore}
        <Link href="/mandat-facturation">{t.mandate}</Link>
        {t.leadAfter}
      </PageHead>
      {!f.billingMandateAcceptedAt && (
        <p className="note err">
          {t.noMandate}
          <Link href="/commercial/profil#facturation">{t.acceptMandate}</Link>
        </p>
      )}
      {years.length > 1 && (
        <div className="inline" style={{ gap: 6 }}>
          {years.map((y) => (
            <Link key={y} className={`clay s btn xs ${y === year ? "" : "ghost"}`} href={`/commercial/revenus?annee=${y}`} aria-current={y === year ? "page" : undefined}>
              {y}
            </Link>
          ))}
        </div>
      )}
      <section className="clay panel">
        <div className="row-between">
          <h2>{t.year(year)}</h2>
          {mine.length > 0 && (
            <span className="inline">
              <Link className="clay s btn xs ghost" href={`/commercial/recapitulatif/${year}`}>
                {t.summary}
              </Link>
              <a className="clay s btn xs" href={`/commercial/recapitulatif/${year}/export`}>
                {t.export}
              </a>
            </span>
          )}
        </div>
        {mine.length === 0 ? (
          <p className="muted">{t.none}</p>
        ) : (
          <>
            <div className="dev"><span>{t.count(sum.count)}</span><b>{fm.eurosPrecise(sum.htCents)}</b></div>
            {sum.vatCents > 0 && <div className="dev"><span>{t.vat}</span><b>{fm.eurosPrecise(sum.vatCents)}</b></div>}
            {sum.commissionCents > 0 && <div className="dev"><span>{t.commission}</span><b>{fm.eurosPrecise(-sum.commissionCents)}</b></div>}
            <div className="dev"><span>{t.net}</span><b>{fm.eurosPrecise(sum.netCents)}</b></div>
          </>
        )}
      </section>
      {[...months].map(([month, list]) => (
        <section key={month} className="clay panel">
          <div className="row-between">
            <h2 style={{ textTransform: "capitalize" }}>{fm.monthLabel(month)}</h2>
            <Link className="clay s btn xs ghost" href={`/commercial/releves/${month}`}>
              {t.statement}
            </Link>
          </div>
          <div className="tblwrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">{t.invoice}</th>
                  <th scope="col">{t.mission}</th>
                  <th scope="col">{t.payout}</th>
                  <th scope="col" style={{ textAlign: "right" }}>{t.netCol}</th>
                </tr>
              </thead>
              <tbody>
                {list.map(({ inv, p }) => (
                  <tr key={inv.id}>
                    <td><Link href={`/commercial/factures/${inv.id}`}>{inv.number}</Link></td>
                    <td>{translateInvoiceText(inv.label, fm.lang) ?? inv.label}</td>
                    <td>
                      {fm.longDate(p.scheduledFor)}{" "}
                      <Status tone={p.status === "transfere" ? "ok" : p.status === "echoue" ? "warn" : "info"}>{t.status[p.status] ?? p.status}</Status>
                    </td>
                    <td style={{ textAlign: "right" }}>{fm.eurosPrecise(inv.netCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}
