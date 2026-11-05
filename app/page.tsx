import Link from "@/components/link";
import { getDb } from "@/db";
import { EventArt } from "@/components/event-art";
import { EventCarousel } from "@/components/event-carousel";
import { daysUntil, eventDayCount } from "@/lib/format";
import { domainLabels } from "@/lib/i18n/messages/domain";
import { home } from "@/lib/i18n/messages/home";
import { getFmt, getMessages } from "@/lib/i18n/server";
import { platformStats, upcomingEvents } from "@/lib/queries";

export const dynamic = "force-dynamic";

const STEP_COLORS = ["#4D58EE", "#FF8CB6", "#68D1A4"];

export default async function Home({ searchParams }: { searchParams: Promise<{ compte?: string }> }) {
  const { compte } = await searchParams;
  const db = await getDb();
  const events = await upcomingEvents(db, { limit: 6 });
  const salons = (await upcomingEvents(db, { kind: "salon", limit: 3 })).filter((e) => daysUntil(e.startsOn) >= 0);
  const stats = await platformStats(db);
  const t = await getMessages(home);
  const f = await getFmt();
  const dl = domainLabels(f.lang);

  return (
    <>
      {compte === "supprime" && <p className="note ok">{t.deleted}</p>}
      <section className="hero">
        <div className="hero-copy">
          <span className="clay s lab hero-kicker">
            <span className="ball" style={{ width: 8, height: 8, background: "#68D1A4" }}></span>
            {t.kicker}
          </span>
          <h1 className="disp">
            {t.h1.before}{" "}
            <span className="clay hl" style={{ ["--c" as string]: "#FFCD4A" }}>
              {t.h1.highlight}
            </span>{" "}
            {t.h1.after}
          </h1>
          <p className="hero-lead">{t.lead}</p>
          <div className="hero-cta">
            <Link className="clay btn" href="/reserver/nouveau" prefetch={false}>
              {t.ctaBook}
            </Link>
            <Link className="clay btn butter" href="/inscription/commercial">
              {t.ctaFreelancer}
            </Link>
          </div>
          <dl className="hero-stats">
            <div>
              <dt className="muted small">{t.statProfiles}</dt>
              <dd className="disp">{stats.freelancers.toLocaleString(f.locale)}</dd>
            </div>
            <div>
              <dt className="muted small">{t.statEvents}</dt>
              <dd className="disp">{events.length}</dd>
            </div>
            {stats.ratingX10 > 0 && (
              <div>
                <dt className="muted small">{t.statRating}</dt>
                <dd className="disp">{f.rating(stats.ratingX10)}/5</dd>
              </div>
            )}
          </dl>
          {stats.verifiedOn && <p className="muted" style={{ fontSize: 12 }}>{t.verified(f.longDate(stats.verifiedOn))}</p>}
        </div>
        {/* sur mobile, le carrousel laisse la place à l'agenda plus bas */}
        <div className="hero-side">
          <EventCarousel events={events} />
        </div>
      </section>

      <section className="section" aria-labelledby="steps-title">
        <div className="section-head">
          <div>
            <span className="lab">{t.eyebrows.how}</span>
            <h2 className="big" id="steps-title">{t.stepsTitle}</h2>
          </div>
          <p className="muted">{t.stepsLead}</p>
        </div>
        <ol className="steps">
          {t.steps.map(([title, d], i) => (
            <li key={title} className="clay step">
              <span className="clay s disp num" style={{ ["--c" as string]: STEP_COLORS[i], color: i === 0 ? "#fff" : undefined }} aria-hidden="true">
                {i + 1}
              </span>
              <div>
                <h3>{title}</h3>
                <p className="muted">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="section" aria-labelledby="agenda-title">
        <div className="section-head">
          <div>
            <span className="lab">{t.eyebrows.agenda}</span>
            <h2 className="big" id="agenda-title">{t.nextTitle}</h2>
          </div>
          <p className="muted">{t.nextLead}</p>
        </div>
        <div className="salons">
          {salons.map((e) => {
            const inDays = daysUntil(e.startsOn);
            return (
              <article key={e.id} className="clay salon">
                <EventArt logoUrl={e.logoUrl} name={e.name} color={e.color} ratio="26/10" />
                <div className="salon-body">
                  <div className="row-between">
                    <span className="pill">{t.salonPro}</span>
                    <span className="muted small">{inDays > 0 ? t.inDays(inDays) : t.ongoing}</span>
                  </div>
                  <h3>{e.name}</h3>
                  <p className="muted small">
                    {e.city} · {f.dateRange(e.startsOn, e.endsOn)} · {t.days(eventDayCount(e.startsOn, e.endsOn))}
                  </p>
                  <div className="inline" style={{ gap: 6 }}>
                    <span className="tag">{dl.specialty(e.specialty ?? e.sector)}</span>
                    <span className="tag">{t.available(e.available)}</span>
                  </div>
                </div>
                <Link className="clay s btn sm" href={`/reserver/nouveau?salon=${e.slug}`} prefetch={false}>
                  {t.staff}
                </Link>
              </article>
            );
          })}
          {salons.length === 0 && <p className="muted">{t.soon}</p>}
        </div>
      </section>

      <section className="section" aria-label={t.eyebrows.who}>
        <span className="lab">{t.eyebrows.who}</span>
        <div className="audiences">
          <article className="clay audience">
            <span className="lab">{t.companies.label}</span>
            <h3 className="disp">{t.companies.title}</h3>
            <ul className="ticks">
              {t.companies.ticks.map((tick) => (
                <li key={tick}>
                  <i className="clay s" aria-hidden="true"></i>
                  {tick}
                </li>
              ))}
            </ul>
            <Link className="clay btn" href="/inscription/entreprise">
              {t.companies.cta}
            </Link>
          </article>
          <article className="clay audience" style={{ ["--c" as string]: "#F3EBD4" }}>
            <span className="lab">{t.freelancers.label}</span>
            <h3 className="disp">{t.freelancers.title}</h3>
            <ul className="ticks">
              {t.freelancers.ticks.map((tick) => (
                <li key={tick}>
                  <i className="clay s" style={{ ["--c" as string]: "#1C8755" }} aria-hidden="true"></i>
                  {tick}
                </li>
              ))}
            </ul>
            <Link className="clay btn butter" href="/inscription/commercial">
              {t.freelancers.cta}
            </Link>
          </article>
        </div>
      </section>
    </>
  );
}
