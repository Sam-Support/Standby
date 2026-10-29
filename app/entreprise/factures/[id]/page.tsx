import Link from "@/components/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb, schema as s } from "@/db";
import { Bi } from "@/components/bilingual";
import { BackLink } from "@/components/ui";
import { getCurrentUser, requireUser } from "@/lib/auth/session";
import { dateRange, eurosPrecise, fmt, longDate, percent } from "@/lib/format";
import { invoiceDocs, translateInvoiceText } from "@/lib/i18n/messages/invoice";
import { getLang } from "@/lib/i18n/server";
import { assertInvoiceAccess, invoiceClient, type InvoiceClient, type InvoiceLine } from "@/lib/services/billing";
import { creditNotesFor } from "@/lib/services/credit-notes";
import { formatSiret } from "@/lib/siret";
import { PrintButton } from "./print";

export async function generateMetadata() {
  return { title: invoiceDocs[await getLang()].invoice };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(undefined, `/entreprise/factures/${id}`);
  const user = await getCurrentUser();
  const db = await getDb();
  const [company] = user!.role === "admin" ? [null] : await db.select().from(s.companies).where(eq(s.companies.ownerId, user!.id));
  let row;
  try {
    row = await assertInvoiceAccess(db, id, user!.role === "admin" ? null : (company?.id ?? "none"));
  } catch {
    notFound();
  }
  const { invoice, booking } = row;
  const [client] = await db.select().from(s.companies).where(eq(s.companies.id, booking.companyId));
  const [event] = booking.eventId ? await db.select().from(s.events).where(eq(s.events.id, booking.eventId)) : [];
  const lines = invoice.lines as InvoiceLine[];
  const cl = (invoice.client as InvoiceClient | null) ?? invoiceClient(client); // factures antérieures : coordonnées actuelles
  const credits = await creditNotesFor(db, [invoice.id]);
  const vatBps = invoice.totalHtCents ? Math.round((invoice.vatCents / invoice.totalHtCents) * 10000) : 2000;
  // document en français (il fait foi) ; traduction sous chaque mention pour un lecteur anglais ou espagnol
  const lang = await getLang();
  const F = invoiceDocs.fr;
  const T = lang === "fr" ? null : invoiceDocs[lang];
  const f = fmt(lang);
  const where = (d: (a: string, b: string, y?: boolean) => string) => (event ? `${event.city} · ${d(event.startsOn, event.endsOn, true)}` : "");
  const what = (t: typeof F) => `${t.standTeam} · ${event?.name} · ${where(t === F ? dateRange : f.dateRange)} · ${t.ref(booking.ref)}`;

  return (
    <>
      <div className="row-between noprint">
        <BackLink href={user!.role === "admin" ? "/admin/finances" : `/entreprise/reservations/${booking.id}`}>{(T ?? F).back}</BackLink>
        <PrintButton label={(T ?? F).print} />
      </div>
      <article className="invoice clay">
        <div className="row-between" style={{ alignItems: "flex-start" }}>
          <div>
            <p className="logo disp">standby</p>
            <p className="small" style={{ marginTop: 8 }}>
              <span className="todo">[raison sociale]</span> · <span className="todo">[adresse]</span>
              <br />
              SIRET <span className="todo">[14 chiffres]</span> · TVA <span className="todo">[numéro]</span>
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <h1 className="disp" style={{ fontSize: 30 }}>
              <Bi fr={F.invoice} tr={T?.invoice} lang={lang} />
            </h1>
            <p><b>{invoice.number}</b></p>
            <p className="small">
              <Bi fr={F.issuedOn(longDate(invoice.issuedAt))} tr={T?.issuedOn(f.longDate(invoice.issuedAt))} lang={lang} />
            </p>
          </div>
        </div>
        <div>
          <span className="lab">
            <Bi fr={F.client} tr={T?.client} lang={lang} inline />
          </span>
          <p>
            <b>{cl.name}</b>
            <br />
            {cl.address ?? <span className="todo">{(T ?? F).noAddress}</span>}
            <br />
            SIRET {formatSiret(cl.siret)} · TVA {cl.vatNumber}
          </p>
        </div>
        <p>
          <Bi fr={F.service(what(F))} tr={T?.service(what(T))} lang={lang} />
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
              {lines.map((l) => (
                <tr key={l.label}>
                  <td><Bi fr={l.label} tr={translateInvoiceText(l.label, lang)} lang={lang} /></td>
                  <td><Bi fr={l.detail} tr={translateInvoiceText(l.detail, lang)} lang={lang} /></td>
                  <td style={{ textAlign: "right" }}>{eurosPrecise(l.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginLeft: "auto", minWidth: 280, display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="dev"><span><Bi fr={F.totalHt} tr={T?.totalHt} lang={lang} /></span><b>{eurosPrecise(invoice.totalHtCents)}</b></div>
          <div className="dev"><span><Bi fr={F.vat(percent(vatBps))} tr={T?.vat(f.percent(vatBps))} lang={lang} /></span><b>{eurosPrecise(invoice.vatCents)}</b></div>
          <div className="ttc"><span><Bi fr={F.totalTtc} tr={T?.totalTtc} lang={lang} /></span><span className="disp">{eurosPrecise(invoice.totalTtcCents)}</span></div>
          {credits.map((n) => (
            <div key={n.id} className="dev">
              <Link href={`/entreprise/avoirs/${n.id}`}>
                <Bi fr={`${F.creditNote} ${n.number}`} tr={T ? `${T.creditNote} ${n.number}` : null} lang={lang} />
              </Link>
              <b>{eurosPrecise(-n.totalTtcCents)}</b>
            </div>
          ))}
          {credits.length > 0 && (
            <div className="dev">
              <span><Bi fr={F.netAfter} tr={T?.netAfter} lang={lang} /></span>
              <b>{eurosPrecise(invoice.totalTtcCents - credits.reduce((n, c) => n + c.totalTtcCents, 0))}</b>
            </div>
          )}
        </div>
        <p className="muted small">
          {F.due(longDate(invoice.issuedAt))} {F.penalties} <span className="todo">[taux]</span> ; {F.recovery}
          {T && (
            <span className="bi" lang={lang}>
              {T.due(f.longDate(invoice.issuedAt))} {T.penalties} <span className="todo">[rate]</span>; {T.recovery}
            </span>
          )}
        </p>
      </article>
    </>
  );
}
