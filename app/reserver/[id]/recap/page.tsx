import Link from "@/components/link";
import { getFmt, getLang, getMessages, say } from "@/lib/i18n/server";
import { booking } from "@/lib/i18n/messages/booking";
import { domainLabels } from "@/lib/i18n/messages/domain";
import { localizePath } from "@/lib/i18n/config";
import { redirect } from "next/navigation";
import { ActionForm, Submit } from "@/components/action-form";
import { BookingAside, Stepper } from "@/components/booking";
import { Avatar, PageHead } from "@/components/ui";
import { languageCode } from "@/lib/domain";
import { stripeEnabled } from "@/lib/integrations/stripe";
import { billableMinutesPerDay } from "@/lib/pricing";
import { confirmationIssues } from "@/lib/services/booking";
import { templateColumns } from "@/lib/services/leads";
import { confirm } from "../../actions";
import { loadDraft, reachedStep } from "../data";

export async function generateMetadata() {
  return { title: (await getMessages(booking)).meta.recap };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await loadDraft(id, "recap");
  if (!d.event) redirect(localizePath(`/reserver/${id}/evenement`, await getLang()));
  const issues = await Promise.all((await confirmationIssues(d.db, d.booking)).map(say));
  const minutes = billableMinutesPerDay(d.booking.startTime, d.booking.endTime);
  const tpl = await templateColumns(d.db, d.booking, d.company);
  const referent = d.referent
    ? `${d.referent.name}${d.referent.phone ? ` · ${d.referent.phone}` : ""}`
    : `${d.booking.referentOtherName ?? "—"}${d.booking.referentOtherPhone ? ` · ${d.booking.referentOtherPhone}` : ""}`;
  const brochure = d.booking.brochureName ?? d.company.brochureName;
  const m = await getMessages(booking);
  const t = m.recap;
  const f = await getFmt();
  const dl = domainLabels(f.lang);
  const h = f.timeLabel;
  const tplName = d.company.leadMode === "crm" ? m.leadFormats.crm(d.company.crmProvider ?? "CRM") : tpl.name === "Fiche standard Standby" ? m.leadFormats.standard : tpl.name;

  return (
    <>
      <PageHead label={m.head.label} title={m.head.title}>
        {m.head.lead}
      </PageHead>
      <Stepper id={id} current={5} reached={reachedStep(d)} />
      <div className="layout">
        <section className="clay main">
          <p className="note info">{m.onBehalf(d.company.name)}</p>
          <h2 className="ptitle">{t.title}</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "flex-start" }}>
            <div className="sunk" style={{ flex: "1 1 300px", borderRadius: 24, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <dl>
                <div className="kv"><dt>{t.event}</dt><dd>{d.event.name} · {d.event.kind === "salon" ? m.kind.salonLong : m.kind.foireLong}</dd></div>
                <div className="kv"><dt>{t.place}</dt><dd>{d.event.city}{d.booking.stand ? ` · ${m.aside.stand(d.booking.stand)}` : ""}</dd></div>
                <div className="kv"><dt>{t.days}</dt><dd>{d.booking.days.map((x) => f.dayLabel(x)).join(", ")}</dd></div>
                <div className="kv"><dt>{t.hours}</dt><dd>{h(d.booking.startTime)} – {h(d.booking.endTime)} · {t.billed(f.hoursLabel(minutes))}</dd></div>
                <div className="kv"><dt>{t.languages}</dt><dd>{d.booking.languages.map(dl.language).join(", ")}</dd></div>
                <div className="kv"><dt>{t.outfit}</dt><dd>{dl.outfit(d.booking.outfit)}</dd></div>
                <div className="kv"><dt>{t.referent}</dt><dd>{referent}</dd></div>
                {brochure && <div className="kv"><dt>{t.brochure}</dt><dd>{brochure}</dd></div>}
                <div className="kv"><dt>{t.leads}</dt><dd>{tplName} · {d.booking.leadFrequency === "quotidien" ? t.daily : t.end}</dd></div>
              </dl>
              <h3 style={{ font: "800 15px var(--sans)" }}>{t.team}</h3>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10, fontSize: 14 }}>
                {d.assignments.map((a) => (
                  <li key={a.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <Avatar first={a.firstName} last={a.lastName} color={a.avatarColor} />
                    <span>
                      <b>{a.firstName} {a.lastName}</b>
                      <br />
                      <span className="muted small">
                        {dl.role(a.role).short} · {f.hourly(a.hourlyRateCents)}
                        {a.ratingX10 ? ` · ★ ${f.rating(a.ratingX10)}` : ""}
                        {a.topSize ? ` · ${t.outfitSize(a.topSize)}` : ""} · {a.languages.map(languageCode).join(" ")}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="clay" style={{ flex: "1 1 300px", borderRadius: 20, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <h3 style={{ font: "800 15px var(--sans)" }}>{t.quote}</h3>
              {d.quote.lines.map((l) => (
                <div key={l.role} className="dev">
                  <span>
                    {l.qty} × {dl.role(l.role).short}
                    <br />
                    <span className="muted small">{t.lineDetail(f.hoursLabel(minutes), d.quote.days, d.booking.outfit === "standby")}</span>
                  </span>
                  <b>{f.euros(l.totalCents)}</b>
                </div>
              ))}
              <div className="dev" style={{ borderTop: "2px dashed rgba(52,58,112,.16)", paddingTop: 12 }}>
                <span>{t.fees(f.percent(d.quote.serviceFeeBps))}</span>
                <b>{f.euros(d.quote.serviceFeeCents)}</b>
              </div>
              <div className="dev"><b>{t.ht}</b><b>{f.euros(d.quote.totalHtCents)}</b></div>
              <div className="dev"><span>{t.vat(f.percent(d.quote.vatBps))}</span><b>{f.euros(d.quote.vatCents)}</b></div>
              <div className="ttc"><span>{t.ttc}</span><span className="disp">{f.euros(d.quote.totalTtcCents)}</span></div>
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
                      {t.acceptBefore}
                      <Link href="/cgv" target="_blank">
                        {t.terms}
                      </Link>
                      {t.acceptAfter}
                    </span>
                  </label>
                  <p className="muted small">
                    {t.debit}
                    {stripeEnabled() ? t.mandate : ""}
                  </p>
                  <Submit className="clay btn mint" pending={t.pending}>
                    {t.confirm}
                  </Submit>
                </ActionForm>
              )}
            </div>
          </div>
          <div className="nav-row">
            <Link className="clay btn ghost" href={`/reserver/${id}/profils`}>
              {m.back}
            </Link>
            <span className="muted small">
              {t.ref(d.booking.ref)} · {d.event ? f.dateRange(d.event.startsOn, d.event.endsOn, true) : ""}
            </span>
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
