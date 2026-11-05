import Link from "@/components/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb, schema as s } from "@/db";
import { Bi } from "@/components/bilingual";
import { BackLink } from "@/components/ui";
import { getCurrentUser, requireUser } from "@/lib/auth/session";
import { eurosPrecise, fmt, longDate, percent } from "@/lib/format";
import { invoiceDocs } from "@/lib/i18n/messages/invoice";
import { getLang } from "@/lib/i18n/server";
import { invoiceClient, type InvoiceClient } from "@/lib/services/billing";
import { assertCreditNoteAccess } from "@/lib/services/credit-notes";
import { formatSiret } from "@/lib/siret";
import { PrintButton } from "../../factures/[id]/print";

export async function generateMetadata() {
  return { title: invoiceDocs[await getLang()].creditNote };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(undefined, `/entreprise/avoirs/${id}`);
  const user = (await getCurrentUser())!;
  const db = await getDb();
  const [company] = user.role === "admin" ? [null] : await db.select().from(s.companies).where(eq(s.companies.ownerId, user.id));
  let row;
  try {
    row = await assertCreditNoteAccess(db, id, user.role === "admin" ? null : (company?.id ?? "none"));
  } catch {
    notFound();
  }
  const { note, invoice, booking } = row;
  const [client] = await db.select().from(s.companies).where(eq(s.companies.id, booking.companyId));
  const cl = (invoice.client as InvoiceClient | null) ?? invoiceClient(client);
  const vatBps = note.totalHtCents ? Math.round((note.vatCents / note.totalHtCents) * 10000) : 2000;
  const lang = await getLang();
  const F = invoiceDocs.fr;
  const T = lang === "fr" ? null : invoiceDocs[lang];
  const f = fmt(lang);

  return (
    <>
      <div className="row-between noprint">
        <BackLink href={user.role === "admin" ? `/admin/reservations/${booking.id}` : `/entreprise/reservations/${booking.id}`}>{(T ?? F).back}</BackLink>
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
              <Bi fr={F.creditNote} tr={T?.creditNote} lang={lang} />
            </h1>
            <p><b>{note.number}</b></p>
            <p className="small">
              <Bi fr={F.issuedOnM(longDate(note.issuedAt))} tr={T?.issuedOnM(f.longDate(note.issuedAt))} lang={lang} />
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
          <Link href={`/entreprise/factures/${invoice.id}`}>
            <Bi fr={F.creditOnInvoice(invoice.number, longDate(invoice.issuedAt))} tr={T?.creditOnInvoice(invoice.number, f.longDate(invoice.issuedAt))} lang={lang} />
          </Link>{" "}
          · {F.ref(booking.ref)}
        </p>
        <div className="tblwrap">
          <table className="tbl" style={{ fontSize: 14 }}>
            <thead>
              <tr>
                <th scope="col"><Bi fr={F.designation} tr={T?.designation} lang={lang} /></th>
                <th scope="col"><Bi fr={F.reason} tr={T?.reason} lang={lang} /></th>
                <th scope="col" style={{ textAlign: "right" }}><Bi fr={F.amountHt} tr={T?.amountHt} lang={lang} /></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><Bi fr={F.creditOn(invoice.number)} tr={T?.creditOn(invoice.number)} lang={lang} /></td>
                <td>{note.reason}</td>
                <td style={{ textAlign: "right" }}>{eurosPrecise(-note.totalHtCents)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ marginLeft: "auto", minWidth: 280, display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="dev"><span><Bi fr={F.totalHt} tr={T?.totalHt} lang={lang} /></span><b>{eurosPrecise(-note.totalHtCents)}</b></div>
          <div className="dev"><span><Bi fr={F.vat(percent(vatBps))} tr={T?.vat(f.percent(vatBps))} lang={lang} /></span><b>{eurosPrecise(-note.vatCents)}</b></div>
          <div className="ttc"><span><Bi fr={F.totalTtc} tr={T?.totalTtc} lang={lang} /></span><span className="disp">{eurosPrecise(-note.totalTtcCents)}</span></div>
        </div>
        <p className="muted small">
          <Bi fr={F.refund[note.refundStatus]} tr={T?.refund[note.refundStatus]} lang={lang} />
        </p>
      </article>
    </>
  );
}
