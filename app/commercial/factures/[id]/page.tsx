import Link from "@/components/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { Bi } from "@/components/bilingual";
import { BackLink } from "@/components/ui";
import { getCurrentFreelancer, requireUser } from "@/lib/auth/session";
import { eurosPrecise, fmt, longDate, percent } from "@/lib/format";
import { invoiceDocs, translateInvoiceText } from "@/lib/i18n/messages/invoice";
import { getLang } from "@/lib/i18n/server";
import { assertSelfBillAccess, type Supplier } from "@/lib/services/self-billing";
import { formatSiret } from "@/lib/siret";
import { PrintButton } from "@/app/entreprise/factures/[id]/print";

export async function generateMetadata() {
  return { title: `${invoiceDocs[await getLang()].invoice} (${invoiceDocs[await getLang()].selfBilling.toLowerCase()})` };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(undefined, `/commercial/factures/${id}`);
  const f = user.role === "admin" ? null : await getCurrentFreelancer();
  if (user.role !== "admin" && !f) notFound();
  let row;
  try {
    row = await assertSelfBillAccess(await getDb(), id, f?.id ?? null);
  } catch {
    notFound();
  }
  const { inv, p } = row;
  const sup = inv.supplier as Supplier;
  // document en français (il fait foi) ; traduction sous chaque mention pour un lecteur anglais ou espagnol
  const lang = await getLang();
  const F = invoiceDocs.fr;
  const T = lang === "fr" ? null : invoiceDocs[lang];
  const fm = fmt(lang);
  const payment = (t: typeof F, date: (d: string) => string, money: (c: number) => string) =>
    `${t.payment(money(inv.netCents))}${p.status === "transfere" ? t.paidOn(date(p.scheduledFor)) : t.plannedOn(date(p.scheduledFor))}${
      inv.commissionCents > 0 ? t.commission(money(inv.commissionCents)) : ""
    }.`;

  return (
    <>
      <div className="row-between noprint">
        <BackLink href={user.role === "admin" ? "/admin/finances" : "/commercial/revenus"}>{(T ?? F).back}</BackLink>
        <PrintButton label={(T ?? F).print} />
      </div>
      <article className="invoice clay">
        <div className="row-between" style={{ alignItems: "flex-start" }}>
          <div>
            <span className="lab">
              <Bi fr={F.supplier} tr={T?.supplier} lang={lang} inline />
            </span>
            <p>
              <b>{sup.name}</b>
              <br />
              {sup.address}
              <br />
              {sup.legalStatus ?? F.soleTrader} · SIRET {sup.siret ? formatSiret(sup.siret) : "—"}
              {sup.vatNumber ? (
                <>
                  <br />
                  TVA {sup.vatNumber}
                </>
              ) : null}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <h1 className="disp" style={{ fontSize: 30 }}>
              <Bi fr={F.invoice} tr={T?.invoice} lang={lang} />
            </h1>
            <p><b>{inv.number}</b></p>
            <p className="small">
              <Bi fr={F.issuedOn(longDate(inv.issuedAt))} tr={T?.issuedOn(fm.longDate(inv.issuedAt))} lang={lang} />
            </p>
            <p className="small">
              <b>
                <Bi fr={F.selfBilling} tr={T?.selfBilling} lang={lang} />
              </b>
            </p>
          </div>
        </div>
        <div>
          <span className="lab">
            <Bi fr={F.client} tr={T?.client} lang={lang} inline />
          </span>
          <p className="small">
            <span className="todo">[raison sociale de l’éditeur de stand-by]</span> · <span className="todo">[adresse]</span>
            <br />
            SIRET <span className="todo">[14 chiffres]</span> · TVA <span className="todo">[numéro]</span>
          </p>
        </div>
        <p className="small">
          {F.issuedBy(sup.name)}
          <Link href="/mandat-facturation">{F.mandate}</Link>
          {sup.mandateAcceptedAt ? F.mandateAccepted(longDate(sup.mandateAcceptedAt)) : ""}
          {F.cgi}
          {T && (
            <span className="bi" lang={lang}>
              {T.issuedBy(sup.name)}
              {T.mandate}
              {sup.mandateAcceptedAt ? T.mandateAccepted(fm.longDate(sup.mandateAcceptedAt)) : ""}
              {T.cgi}
            </span>
          )}
        </p>
        <div className="tblwrap">
          <table className="tbl" style={{ fontSize: 14 }}>
            <thead>
              <tr>
                <th scope="col"><Bi fr={F.designation} tr={T?.designation} lang={lang} /></th>
                <th scope="col"><Bi fr={F.detail} tr={T?.detail} lang={lang} /></th>
                <th scope="col" style={{ textAlign: "right" }}><Bi fr={F.amountHt} tr={T?.amountHt} lang={lang} /></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><Bi fr={inv.label} tr={translateInvoiceText(inv.label, lang)} lang={lang} /></td>
                <td><Bi fr={inv.detail} tr={translateInvoiceText(inv.detail, lang)} lang={lang} /></td>
                <td style={{ textAlign: "right" }}>{eurosPrecise(inv.amountHtCents)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ marginLeft: "auto", minWidth: 280, display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="dev"><span><Bi fr={F.totalHt} tr={T?.totalHt} lang={lang} /></span><b>{eurosPrecise(inv.amountHtCents)}</b></div>
          {inv.vatBps > 0 ? (
            <div className="dev"><span><Bi fr={F.vat(percent(inv.vatBps))} tr={T?.vat(fm.percent(inv.vatBps))} lang={lang} /></span><b>{eurosPrecise(inv.vatCents)}</b></div>
          ) : (
            <div className="dev"><span><Bi fr={F.vatExempt} tr={T?.vatExempt} lang={lang} /></span><b>{eurosPrecise(0)}</b></div>
          )}
          <div className="ttc"><span><Bi fr={F.totalTtc} tr={T?.totalTtc} lang={lang} /></span><span className="disp">{eurosPrecise(inv.totalTtcCents)}</span></div>
        </div>
        <p className="muted small">
          {payment(F, longDate, eurosPrecise)} {F.penalties} <span className="todo">[taux]</span> ; {F.recovery}
          {T && (
            <span className="bi" lang={lang}>
              {payment(T, fm.longDate, fm.eurosPrecise)} {T.penalties} <span className="todo">[rate]</span>; {T.recovery}
            </span>
          )}
        </p>
        <p className="muted small noprint">
          {(T ?? F).error}
          <Link href={`/contact?ref=${inv.number}`}>{(T ?? F).report}</Link>
          {(T ?? F).errorAfter}
        </p>
      </article>
    </>
  );
}
