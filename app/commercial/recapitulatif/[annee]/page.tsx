import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { BackLink } from "@/components/ui";
import { getCurrentUser, requireFreelancer } from "@/lib/auth/session";
import { freelancer as messages } from "@/lib/i18n/messages/freelancer";
import { invoiceDocs } from "@/lib/i18n/messages/invoice";
import { getFmt, getMessages } from "@/lib/i18n/server";
import { selfBillsFor, yearSummary } from "@/lib/services/self-billing";
import { formatSiret } from "@/lib/siret";
import { PrintButton } from "@/app/entreprise/factures/[id]/print";

export async function generateMetadata() {
  return { title: (await getMessages(messages)).annual.title };
}

export default async function Page({ params }: { params: Promise<{ annee: string }> }) {
  const { annee } = await params;
  if (!/^20\d{2}$/.test(annee)) notFound();
  const f = await requireFreelancer(`/commercial/recapitulatif/${annee}`);
  const user = (await getCurrentUser())!;
  const sum = yearSummary(await selfBillsFor(await getDb(), f.id, Number(annee)));
  const all = await getMessages(messages);
  const t = all.annual;
  const st = all.statement;
  const fm = await getFmt();

  return (
    <>
      <div className="row-between noprint">
        <BackLink href={`/commercial/revenus?annee=${annee}`}>{all.earnings.title}</BackLink>
        <span className="inline">
          <a className="clay s btn sm ghost" href={`/commercial/recapitulatif/${annee}/export`}>
            {all.earnings.export}
          </a>
          <PrintButton label={invoiceDocs[fm.lang].print} />
        </span>
      </div>
      <article className="invoice clay">
        <div className="row-between" style={{ alignItems: "flex-start" }}>
          <div>
            <p className="logo disp">stand-by</p>
            <p className="small" style={{ marginTop: 8 }}>
              <b>{user.firstName} {user.lastName}</b>
              <br />
              {f.billingAddress}
              <br />
              SIRET {f.siret ? formatSiret(f.siret) : "—"}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <h1 className="disp" style={{ fontSize: 30 }}>{t.h1(annee)}</h1>
            <p className="small">{st.edited(fm.longDate(new Date()))}</p>
          </div>
        </div>
        <div className="tblwrap">
          <table className="tbl" style={{ fontSize: 13 }}>
            <thead>
              <tr>
                <th scope="col">{t.period}</th>
                <th scope="col" style={{ textAlign: "right" }}>{t.invoices}</th>
                <th scope="col" style={{ textAlign: "right" }}>{st.ht}</th>
                <th scope="col" style={{ textAlign: "right" }}>{st.vat}</th>
                <th scope="col" style={{ textAlign: "right" }}>{st.commission}</th>
                <th scope="col" style={{ textAlign: "right" }}>{st.net}</th>
              </tr>
            </thead>
            <tbody>
              {sum.quarters.map((q) => (
                <tr key={q.quarter}>
                  <td>{t.quarters[q.quarter - 1]}</td>
                  <td style={{ textAlign: "right" }}>{q.count}</td>
                  <td style={{ textAlign: "right" }}>{fm.eurosPrecise(q.htCents)}</td>
                  <td style={{ textAlign: "right" }}>{fm.eurosPrecise(q.vatCents)}</td>
                  <td style={{ textAlign: "right" }}>{fm.eurosPrecise(-q.commissionCents)}</td>
                  <td style={{ textAlign: "right" }}>{fm.eurosPrecise(q.netCents)}</td>
                </tr>
              ))}
              <tr>
                <th scope="row">{t.total(annee)}</th>
                <td style={{ textAlign: "right" }}><b>{sum.all.count}</b></td>
                <td style={{ textAlign: "right" }}><b>{fm.eurosPrecise(sum.all.htCents)}</b></td>
                <td style={{ textAlign: "right" }}><b>{fm.eurosPrecise(sum.all.vatCents)}</b></td>
                <td style={{ textAlign: "right" }}><b>{fm.eurosPrecise(-sum.all.commissionCents)}</b></td>
                <td style={{ textAlign: "right" }}><b>{fm.eurosPrecise(sum.all.netCents)}</b></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ marginLeft: "auto", minWidth: 300, display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="dev"><span>{t.paid}</span><b>{fm.eurosPrecise(sum.paid.htCents)}</b></div>
          {sum.pending.count > 0 && <div className="dev"><span>{t.pending}</span><b>{fm.eurosPrecise(sum.pending.htCents)}</b></div>}
        </div>
        <p className="muted small">
          {t.help}
          <span className="todo">{t.todo}</span>
        </p>
      </article>
    </>
  );
}
