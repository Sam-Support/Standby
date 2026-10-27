import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, Submit } from "@/components/action-form";
import { BookingAside, Stepper } from "@/components/booking";
import { Status } from "@/components/ui";
import { dateRange } from "@/lib/format";
import { stripeEnabled } from "@/lib/integrations/stripe";
import { billableMinutesPerDay } from "@/lib/pricing";
import { templateColumns } from "@/lib/services/leads";
import { paymentSetup } from "../../actions";
import { loadDraft } from "../data";

export const metadata = { title: "Réservation envoyée" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ paiement?: string }> }) {
  const { id } = await params;
  const { paiement } = await searchParams;
  const d = await loadDraft(id, "confirmation", true);
  if (d.booking.status === "brouillon") redirect(`/reserver/${id}/recap`);
  const total = d.positions.reduce((n, p) => n + p.qty, 0);
  const accepted = d.assignments.filter((a) => a.status === "acceptee").length;
  const tpl = await templateColumns(d.db, d.booking, d.company);
  const referentName = d.referent?.name ?? d.booking.referentOtherName ?? "votre référent";
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
            {d.booking.status === "annulee" ? "Réservation annulée" : "Réservation envoyée"}
          </h1>
          <p className="muted">
            Référence <b>{d.booking.ref}</b> · {d.event?.name} · {d.event ? dateRange(d.event.startsOn, d.event.endsOn, true) : ""}
          </p>
          {paiement === "ok" && <p className="note ok">Moyen de paiement enregistré. Le débit aura lieu après validation des heures.</p>}
          {paiement === "annule" && <p className="note">Le moyen de paiement n’a pas été enregistré. Vous pouvez le faire maintenant ou plus tard.</p>}
          {needsPayment && (
            <ActionForm action={paymentSetup.bind(null, id)}>
              <Submit className="clay btn butter">Enregistrer un mandat SEPA ou une carte</Submit>
            </ActionForm>
          )}
          <p className="muted small" style={{ maxWidth: "36em" }}>
            Chaque commercial reçoit la mission dans son espace et l’accepte. Suivez les acceptations dans votre espace entreprise.
          </p>
          <ol className="tl">
            <li className="done"><b>Aujourd’hui</b><span>Missions proposées aux commerciaux, avec votre brief et votre plaquette</span></li>
            <li><b>J-7</b><span>Demande des badges exposants auprès de l’organisateur</span></li>
            <li><b>J-2</b><span>Briefing visio avec votre référent, {referentName}</span></li>
            <li><b>{d.booking.leadFrequency === "quotidien" ? "Chaque soir" : "Fin de l’événement"}</b><span>Les commerciaux déposent leurs leads au format {tpl.name}</span></li>
            <li><b>Lundi suivant</b><span>Vous validez les heures, la paie part, la facture arrive dans votre espace</span></li>
          </ol>
          <div className="inline" style={{ gap: 12, justifyContent: "center", marginTop: 10 }}>
            <Link className="clay btn" href={`/entreprise/reservations/${id}`}>
              Ouvrir mon espace entreprise
            </Link>
            <Link className="clay btn ghost" href="/reserver/nouveau" prefetch={false}>
              Nouvelle réservation
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
            Acceptations {accepted} / {total}
          </Status>
        </BookingAside>
      </div>
    </>
  );
}
