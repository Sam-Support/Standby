import Link from "next/link";
import { eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb, schema as s } from "@/db";
import { ActionForm, Submit } from "@/components/action-form";
import { AssignmentStatus, BackLink, BookingStatus, Status } from "@/components/ui";
import { ROLES, type RoleKey } from "@/lib/domain";
import { dateRange, dayLabel, euros, eurosPrecise, hourly, hoursLabel, longDate } from "@/lib/format";
import { loadAssignments } from "@/lib/services/booking";
import { creditableCents, creditNotesFor, REFUND_LABELS } from "@/lib/services/credit-notes";
import {
  adminCancelAction,
  adminValidateHours,
  issueCreditNoteAction,
  markRefundedAction,
  retryPaymentAction,
  retryRefundAction,
} from "../../actions";

export const metadata = { title: "Réservation (admin)" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = await getDb();
  const [b] = await db.select().from(s.bookings).where(eq(s.bookings.id, id));
  if (!b) notFound();
  const [c] = await db.select().from(s.companies).where(eq(s.companies.id, b.companyId));
  const [e] = b.eventId ? await db.select().from(s.events).where(eq(s.events.id, b.eventId)) : [];
  const asg = await loadAssignments(db, id);
  const details = asg.length ? await db.select().from(s.assignments).where(inArray(s.assignments.id, asg.map((a) => a.id))) : [];
  const sheets = asg.length ? await db.select().from(s.timesheets).where(inArray(s.timesheets.assignmentId, asg.map((a) => a.id))) : [];
  const payments = await db.select().from(s.payments).where(eq(s.payments.bookingId, id));
  const [invoice] = await db.select().from(s.invoices).where(eq(s.invoices.bookingId, id));
  const credits = await creditNotesFor(db, invoice ? [invoice.id] : []);
  const creditable = invoice ? await creditableCents(db, invoice.id) : 0;

  return (
    <>
      <BackLink href="/admin/reservations">Réservations</BackLink>
      <div className="head">
        <div>
          <span className="lab">{b.ref} · {c.name}</span>
          <h1>{e?.name ?? "Brouillon"}</h1>
          <p>{e ? `${e.city} · ${dateRange(e.startsOn, e.endsOn, true)}` : ""} · {b.days.map((d) => dayLabel(d)).join(", ")}</p>
        </div>
        <BookingStatus status={b.status} />
      </div>
      <section className="clay panel">
        <h2>Équipe et heures</h2>
        {asg.map((a) => {
          const mine = sheets.filter((t) => t.assignmentId === a.id);
          const d = details.find((x) => x.id === a.id);
          const declared = mine.reduce((n, t) => n + t.minutesDeclared, 0);
          const retained = mine.reduce((n, t) => n + (t.minutesValidated ?? t.minutesDeclared), 0);
          const validated = mine.length > 0 && mine.every((t) => t.status === "valide");
          const disputed = mine.some((t) => t.status === "conteste");
          const adjusting = mine.some((t) => t.status === "ajuste");
          return (
            <div key={a.id} className="brow" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
              <div className="row-between">
                <span>
                  <b>{a.firstName} {a.lastName}</b>{" "}
                  <span className="muted small">
                    · {ROLES[a.role as RoleKey]?.short} · {hourly(a.hourlyRateCents)} · score {a.matchScore}
                    {mine.length ? ` · ${hoursLabel(declared)} déclarées` : ""}
                    {adjusting || disputed ? ` · ${hoursLabel(retained)} retenues par l’exposant` : ""}
                  </span>
                </span>
                <span className="inline">
                  <AssignmentStatus status={a.status} />
                  {validated && <Status tone="ok">heures validées</Status>}
                  {adjusting && <Status tone="info">ajustement en attente du commercial</Status>}
                  {disputed && <Status tone="warn">heures contestées</Status>}
                  {b.status === "heures_a_valider" && a.status === "acceptee" && !validated && (
                    <ActionForm action={adminValidateHours.bind(null, a.id, b.companyId)} className="inline" style={{ gap: 6 }}>
                      <input className="input" name="hours" placeholder={String((disputed ? retained : declared) / 60 || "")} aria-label={`Heures retenues pour ${a.firstName}`} style={{ width: 80, minHeight: 36, padding: "6px 10px" }} />
                      <Submit className="clay s btn xs ok">Arbitrer et valider</Submit>
                    </ActionForm>
                  )}
                </span>
              </div>
              {a.status === "desistee" && d && (
                <p className="muted small">
                  Désistement le {d.withdrawnAt ? longDate(d.withdrawnAt) : "?"} · motif : « {d.withdrawalReason} »
                </p>
              )}
              {(adjusting || disputed) && d && (
                <p className="muted small">
                  Motif de l’exposant : « {d.hoursAdjustmentNote ?? "non précisé"} »{disputed ? ` · contestation du commercial : « ${d.hoursDisputeNote} »` : ""}
                </p>
              )}
            </div>
          );
        })}
      </section>
      <div className="grid2">
        <section className="clay panel">
          <h2>Paiement</h2>
          {b.totalHtCents && <div className="dev"><span>Devis HT</span><b>{euros(b.totalHtCents)}</b></div>}
          {invoice && (
            <div className="dev">
              <Link href={`/entreprise/factures/${invoice.id}`}>Facture {invoice.number}</Link>
              <b>{euros(invoice.totalTtcCents)} TTC · commission {euros(invoice.serviceFeeCents)}</b>
            </div>
          )}
          {payments.map((p) => (
            <div key={p.id} className="brow">
              <span>
                {euros(p.amountCents)} · <Status tone={p.status === "reussi" ? "ok" : p.status === "echoue" ? "warn" : "info"}>{p.status.replace("_", " ")}</Status>
                {p.error ? <span className="muted small"> · {p.error}</span> : null}
              </span>
              {p.status === "echoue" && (
                <ActionForm action={retryPaymentAction.bind(null, p.id)}>
                  <Submit className="clay s btn xs">Relancer</Submit>
                </ActionForm>
              )}
            </div>
          ))}
          {payments.length === 0 && <p className="muted small">Aucun paiement (créé après validation des heures).</p>}
          {credits.map((n) => (
            <div key={n.id} className="brow">
              <span>
                <Link href={`/entreprise/avoirs/${n.id}`}>Avoir {n.number}</Link> · {eurosPrecise(-n.totalTtcCents)} TTC ·{" "}
                <Status tone={REFUND_LABELS[n.refundStatus].tone}>{REFUND_LABELS[n.refundStatus].label}</Status>
                <br />
                <span className="muted small">{n.reason}{n.refundError ? ` · ${n.refundError}` : ""}</span>
              </span>
              {n.refundStatus === "echoue" && (
                <span className="inline">
                  <ActionForm action={retryRefundAction.bind(null, n.id)}>
                    <Submit className="clay s btn xs">Relancer le remboursement</Submit>
                  </ActionForm>
                  <ActionForm action={markRefundedAction.bind(null, n.id)}>
                    <Submit className="clay s btn xs ghost">Remboursé par virement</Submit>
                  </ActionForm>
                </span>
              )}
            </div>
          ))}
        </section>
        <section className="clay panel">
          <h2>Actions</h2>
          {["brouillon", "envoyee", "partielle", "confirmee", "en_cours"].includes(b.status) ? (
            <ActionForm action={adminCancelAction.bind(null, b.id)} className="stack">
              <label className="check">
                <input type="checkbox" name="waive" />
                Annuler sans frais (geste commercial, aucune indemnité versée)
              </label>
              <Submit className="clay s btn sm danger">Annuler la réservation</Submit>
            </ActionForm>
          ) : !invoice ? (
            <p className="muted small">Aucune action disponible pour ce statut.</p>
          ) : null}
          {invoice && creditable > 0 && (
            <ActionForm action={issueCreditNoteAction.bind(null, invoice.id)} className="stack" style={{ gap: 12 }}>
              <h3 className="stitle">Émettre un avoir</h3>
              <p className="muted small">
                Erreur de facturation, geste commercial ou litige réglé : remboursé sur le moyen de paiement si la facture est réglée, déduit du
                prélèvement sinon. La paie des commerciaux n’est pas modifiée. Reste à créditer : {eurosPrecise(creditable)} TTC.
              </p>
              <label className="field">
                Montant TTC (€)
                <input className="input" name="amount" inputMode="decimal" defaultValue={(creditable / 100).toFixed(2).replace(".", ",")} required />
              </label>
              <label className="field">
                Motif (figure sur l’avoir)
                <input className="input" name="reason" maxLength={500} required />
              </label>
              <div>
                <Submit className="clay s btn sm" pending="Émission…">Émettre l’avoir</Submit>
              </div>
            </ActionForm>
          )}
        </section>
      </div>
    </>
  );
}
