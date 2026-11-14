import Link from "@/components/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { BackLink } from "@/components/ui";
import { getCurrentUser, requireFreelancer } from "@/lib/auth/session";
import { freelancer as messages } from "@/lib/i18n/messages/freelancer";
import { invoiceDocs, translateInvoiceText } from "@/lib/i18n/messages/invoice";
import { getFmt, getMessages } from "@/lib/i18n/server";
import { payoutMonth, selfBillsFor, totals } from "@/lib/services/self-billing";
import { LogoMark } from "@/components/logo";
import { formatSiret } from "@/lib/siret";
import { PrintButton } from "@/app/entreprise/factures/[id]/print";

export async function generateMetadata() {
  return { title: (await getMessages(messages)).statement.title };
}

export default async function Page({ params }: { params: Promise<{ mois: string }> }) {
  const { mois } = await params;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mois)) notFound();
  const f = await requireFreelancer(`/commercial/releves/${mois}`);
  const user = (await getCurrentUser())!;
  const rows = (await selfBillsFor(await getDb(), f.id, Number(mois.slice(0, 4)))).filter((r) => payoutMonth(r) === mois).reverse();
  const sum = totals(rows);
  const all = await getMessages(messages);
  const t = all.statement;
  const fm = await getFmt();

  return (
    <>
      <div className="row-between noprint">
        <BackLink href={`/commercial/revenus?annee=${mois.slice(0, 4)}`}>{all.earnings.title}</BackLink>
        <PrintButton label={invoiceDocs[fm.lang].print} />
      </div>
      <article className="invoice clay">
        <div className="row-between" style={{ alignItems: "flex-start" }}>
          <div>
            <p className="logo disp">
              <LogoMark />
              stand-by
            </p>
            <p className="small" style={{ marginTop: 8 }}>
              <b>{user.firstName} {user.lastName}</b>
              <br />
              {f.billingAddress}
              <br />
              SIRET {f.siret ? formatSiret(f.siret) : "—"}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <h1 className="disp" style={{ fontSize: 30 }}>{t.title}</h1>
            <p style={{ textTransform: "capitalize" }}><b>{fm.monthLabel(mois)}</b></p>
            <p className="small">{t.edited(fm.longDate(new Date()))}</p>
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="muted">{t.none}</p>
        ) : (
          <div className="tblwrap">
            <table className="tbl" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th scope="col">{t.payout}</th>
                  <th scope="col">{t.invoice}</th>
                  <th scope="col">{t.mission}</th>
                  <th scope="col" style={{ textAlign: "right" }}>{t.ht}</th>
                  <th scope="col" style={{ textAlign: "right" }}>{t.vat}</th>
                  <th scope="col" style={{ textAlign: "right" }}>{t.commission}</th>
                  <th scope="col" style={{ textAlign: "right" }}>{t.net}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ inv, p }) => (
                  <tr key={inv.id}>
                    <td>{fm.longDate(p.scheduledFor)} · {all.earnings.status[p.status] ?? p.status}</td>
                    <td><Link href={`/commercial/factures/${inv.id}`}>{inv.number}</Link></td>
                    <td>{translateInvoiceText(inv.label, fm.lang) ?? inv.label}</td>
                    <td style={{ textAlign: "right" }}>{fm.eurosPrecise(inv.amountHtCents)}</td>
                    <td style={{ textAlign: "right" }}>{fm.eurosPrecise(inv.vatCents)}</td>
                    <td style={{ textAlign: "right" }}>{fm.eurosPrecise(-inv.commissionCents)}</td>
                    <td style={{ textAlign: "right" }}>{fm.eurosPrecise(inv.netCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ marginLeft: "auto", minWidth: 280, display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="dev"><span>{t.totalHt}</span><b>{fm.eurosPrecise(sum.htCents)}</b></div>
          <div className="dev"><span>{t.vat}</span><b>{fm.eurosPrecise(sum.vatCents)}</b></div>
          <div className="dev"><span>{t.commissionTotal}</span><b>{fm.eurosPrecise(-sum.commissionCents)}</b></div>
          <div className="ttc"><span>{t.net}</span><span className="disp">{fm.eurosPrecise(sum.netCents)}</span></div>
        </div>
        <p className="muted small">{t.help}</p>
      </article>
    </>
  );
}
