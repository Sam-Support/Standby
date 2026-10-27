import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, Submit } from "@/components/action-form";
import { BookingAside, Stepper } from "@/components/booking";
import { Avatar, PageHead } from "@/components/ui";
import { languageCode, OUTFITS, ROLES, type OutfitKey, type RoleKey } from "@/lib/domain";
import { dateRange, dayLabel, euros, hourly, hoursLabel, percent, rating, timeLabel } from "@/lib/format";
import { stripeEnabled } from "@/lib/integrations/stripe";
import { billableMinutesPerDay } from "@/lib/pricing";
import { confirmationIssues } from "@/lib/services/booking";
import { templateColumns } from "@/lib/services/leads";
import { confirm } from "../../actions";
import { loadDraft, reachedStep } from "../data";

export const metadata = { title: "Réserver · Récapitulatif" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await loadDraft(id, "recap");
  if (!d.event) redirect(`/reserver/${id}/evenement`);
  const issues = await confirmationIssues(d.db, d.booking);
  const minutes = billableMinutesPerDay(d.booking.startTime, d.booking.endTime);
  const tpl = await templateColumns(d.db, d.booking, d.company);
  const referent = d.referent
    ? `${d.referent.name}${d.referent.phone ? ` · ${d.referent.phone}` : ""}`
    : `${d.booking.referentOtherName ?? "—"}${d.booking.referentOtherPhone ? ` · ${d.booking.referentOtherPhone}` : ""}`;
  const brochure = d.booking.brochureName ?? d.company.brochureName;
  const h = timeLabel;

  return (
    <>
      <PageHead label="Réservation exposant" title="Réserver une équipe de stand">
        Cinq étapes. L’estimation se met à jour à chaque choix, le total définitif apparaît au récapitulatif.
      </PageHead>
      <Stepper id={id} current={5} reached={reachedStep(d)} />
      <div className="layout">
        <section className="clay main">
          <p className="note info">Réservation au nom de {d.company.name}</p>
          <h2 className="ptitle">Récapitulatif</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "flex-start" }}>
            <div className="sunk" style={{ flex: "1 1 300px", borderRadius: 24, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <dl>
                <div className="kv"><dt>Événement</dt><dd>{d.event.name} · {d.event.kind === "salon" ? "salon professionnel" : "foire"}</dd></div>
                <div className="kv"><dt>Lieu</dt><dd>{d.event.city}{d.booking.stand ? ` · stand ${d.booking.stand}` : ""}</dd></div>
                <div className="kv"><dt>Jours</dt><dd>{d.booking.days.map((x) => dayLabel(x)).join(", ")}</dd></div>
                <div className="kv"><dt>Horaires</dt><dd>{h(d.booking.startTime)} – {h(d.booking.endTime)} · {hoursLabel(minutes)} facturées/jour</dd></div>
                <div className="kv"><dt>Langues</dt><dd>{d.booking.languages.join(", ")}</dd></div>
                <div className="kv"><dt>Tenue</dt><dd>{OUTFITS[d.booking.outfit as OutfitKey]}</dd></div>
                <div className="kv"><dt>Référent</dt><dd>{referent}</dd></div>
                {brochure && <div className="kv"><dt>Plaquette</dt><dd>{brochure}</dd></div>}
                <div className="kv"><dt>Leads</dt><dd>{tpl.name} · {d.booking.leadFrequency === "quotidien" ? "fin de chaque journée" : "fin de l’événement"}</dd></div>
              </dl>
              <h3 style={{ font: "800 15px var(--sans)" }}>Votre équipe</h3>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10, fontSize: 14 }}>
                {d.assignments.map((a) => (
                  <li key={a.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <Avatar first={a.firstName} last={a.lastName} color={a.avatarColor} />
                    <span>
                      <b>{a.firstName} {a.lastName}</b>
                      <br />
                      <span className="muted small">
                        {ROLES[a.role as RoleKey]?.short} · {hourly(a.hourlyRateCents)}
                        {a.ratingX10 ? ` · ★ ${rating(a.ratingX10)}` : ""}
                        {a.topSize ? ` · tenue ${a.topSize}` : ""} · {a.languages.map(languageCode).join(" ")}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="clay" style={{ flex: "1 1 300px", borderRadius: 20, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <h3 style={{ font: "800 15px var(--sans)" }}>Devis</h3>
              {d.quote.lines.map((l) => (
                <div key={l.role} className="dev">
                  <span>
                    {l.label}
                    <br />
                    <span className="muted small">
                      {hoursLabel(minutes)} × {d.quote.days} jour{d.quote.days > 1 ? "s" : ""}
                      {d.booking.outfit === "standby" ? " · tenue Standby" : ""}
                    </span>
                  </span>
                  <b>{euros(l.totalCents)}</b>
                </div>
              ))}
              <div className="dev" style={{ borderTop: "2px dashed rgba(52,58,112,.16)", paddingTop: 12 }}>
                <span>Frais de service ({percent(d.quote.serviceFeeBps)})</span>
                <b>{euros(d.quote.serviceFeeCents)}</b>
              </div>
              <div className="dev"><b>Total HT</b><b>{euros(d.quote.totalHtCents)}</b></div>
              <div className="dev"><span>TVA {percent(d.quote.vatBps)}</span><b>{euros(d.quote.vatCents)}</b></div>
              <div className="ttc"><span>Total TTC</span><span className="disp">{euros(d.quote.totalTtcCents)}</span></div>
              {issues.length > 0 ? (
                <div className="note">
                  {issues.map((i) => (
                    <p key={i}>{i}</p>
                  ))}
                </div>
              ) : (
                <ActionForm action={confirm.bind(null, id)} className="stack" style={{ gap: 12 }}>
                  <label className="check">
                    <input type="checkbox" name="cgv" required />
                    <span>
                      J’accepte les <Link href="/cgv" target="_blank">conditions de prestation</Link> et la facturation après validation des heures.
                    </span>
                  </label>
                  <p className="muted small">
                    Le règlement est débité après validation des heures en fin d’événement.
                    {stripeEnabled() ? " Vous enregistrez maintenant un mandat SEPA ou une carte." : ""}
                  </p>
                  <Submit className="clay btn mint" pending="Envoi des missions…">
                    Confirmer la réservation
                  </Submit>
                </ActionForm>
              )}
            </div>
          </div>
          <div className="nav-row">
            <Link className="clay btn ghost" href={`/reserver/${id}/profils`}>
              Retour
            </Link>
            <span className="muted small">Réf. {d.booking.ref} · {d.event ? dateRange(d.event.startsOn, d.event.endsOn, true) : ""}</span>
          </div>
        </section>
        <BookingAside
          event={d.event}
          stand={d.booking.stand}
          days={d.booking.days.length}
          minutesPerDay={minutes}
          startTime={d.booking.startTime}
          endTime={d.booking.endTime}
          people={d.quote.people}
          companyName={d.company.name}
          quote={d.quote}
          estimated={d.estimated}
        />
      </div>
    </>
  );
}
