import Link from "@/components/link";
import { getFmt, getLang, getMessages } from "@/lib/i18n/server";
import { booking } from "@/lib/i18n/messages/booking";
import { localizePath } from "@/lib/i18n/config";
import { redirect } from "next/navigation";
import { ActionForm, Submit } from "@/components/action-form";
import { BookingAside, Stepper } from "@/components/booking";
import { Status } from "@/components/ui";
import { stripeEnabled } from "@/lib/integrations/stripe";
import { billableMinutesPerDay } from "@/lib/pricing";
import { templateColumns } from "@/lib/services/leads";
import { paymentSetup } from "../../actions";
import { loadDraft } from "../data";

export async function generateMetadata() {
  return { title: (await getMessages(booking)).meta.sent };
}

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ paiement?: string }> }) {
  const { id } = await params;
  const { paiement } = await searchParams;
  const d = await loadDraft(id, "confirmation", true);
  if (d.booking.status === "brouillon") redirect(localizePath(`/reserver/${id}/recap`, await getLang()));
  const total = d.positions.reduce((n, p) => n + p.qty, 0);
  const accepted = d.assignments.filter((a) => a.status === "acceptee").length;
  const tpl = await templateColumns(d.db, d.booking, d.company);
  const m = await getMessages(booking);
  const t = m.sent;
  const f = await getFmt();
  const referentName = d.referent?.name ?? d.booking.referentOtherName ?? t.yourReferent;
  const tplName = d.company.leadMode === "crm" ? m.leadFormats.crm(d.company.crmProvider ?? "CRM") : tpl.name === "Fiche standard Standby" ? m.leadFormats.standard : tpl.name;
  const timeline = [t.timeline.today, t.timeline.badges, t.timeline.briefing(referentName), t.timeline.leads(d.booking.leadFrequency === "quotidien", tplName), t.timeline.monday];
  const needsPayment = stripeEnabled() && !d.company.stripePaymentMethodId;

  return (
    <>
      <Stepper id={id} current={6} reached={0} />
      <div className="layout">
        <section className="clay main" style={{ alignItems: "center", textAlign: "center", gap: 14, paddingTop: 36, paddingBottom: 36 }}>
          <span className="clay avatar" style={{ ["--c" as string]: "#68D1A4", width: 110, height: 110, color: "#fff", fontSize: 50 }} aria-hidden="true">
            ✓
          </span>
          <h1 className="disp" style={{ fontSize: 34, lineHeight: 1.1 }}>
            {d.booking.status === "annulee" ? t.cancelled : t.sent}
          </h1>
          <p className="muted">
            {t.reference} <b>{d.booking.ref}</b> · {d.event?.name} · {d.event ? f.dateRange(d.event.startsOn, d.event.endsOn, true) : ""}
          </p>
          {paiement === "ok" && <p className="note ok">{t.paymentOk}</p>}
          {paiement === "annule" && <p className="note">{t.paymentCancelled}</p>}
          {needsPayment && (
            <ActionForm action={paymentSetup.bind(null, id)}>
              <Submit className="clay btn butter">{t.savePayment}</Submit>
            </ActionForm>
          )}
          <p className="muted small" style={{ maxWidth: "36em" }}>
            {t.each}
          </p>
          <ol className="tl">
            {timeline.map(([when, what], i) => (
              <li key={when} className={i === 0 ? "done" : undefined}>
                <b>{when}</b>
                <span>{what}</span>
              </li>
            ))}
          </ol>
          <div className="inline" style={{ gap: 12, justifyContent: "center", marginTop: 10 }}>
            <Link className="clay btn" href={`/entreprise/reservations/${id}`}>
              {t.open}
            </Link>
            <Link className="clay btn ghost" href="/reserver/nouveau" prefetch={false}>
              {t.new}
            </Link>
          </div>
        </section>
        <BookingAside
          event={d.event}
          stand={d.booking.stand}
          days={d.booking.days.length}
          minutesPerDay={billableMinutesPerDay(d.booking.startTime, d.booking.endTime)}
          startTime={d.booking.startTime}
          endTime={d.booking.endTime}
          people={total}
          quote={d.booking.quote ? (d.booking.quote as typeof d.quote) : d.quote}
          ttc
        >
          <Status tone={accepted >= total ? "ok" : "warn"}>
            {t.acceptances(accepted, total)}
          </Status>
        </BookingAside>
      </div>
    </>
  );
}
