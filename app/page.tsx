import Link from "@/components/link";
import { publishedReviews } from "@/lib/services/reviews";
import { features } from "@/lib/i18n/messages/features";
import { getDb } from "@/db";
import { CostSimulator } from "@/components/cost-simulator";
import { EventArt } from "@/components/event-art";
import { EventCarousel } from "@/components/event-carousel";
import { Avatar } from "@/components/ui";
import { daysUntil, eventDayCount } from "@/lib/format";
import { domainLabels } from "@/lib/i18n/messages/domain";
import { home } from "@/lib/i18n/messages/home";
import { getFmt, getMessages } from "@/lib/i18n/server";
import { featuredFreelancer, platformStats, upcomingEvents } from "@/lib/queries";
import { getPricing } from "@/lib/settings";

export const dynamic = "force-dynamic";

const STEP_COLORS = ["#4D58EE", "#FF8CB6", "#68D1A4"];

export default async function Home({ searchParams }: { searchParams: Promise<{ compte?: string }> }) {
  const { compte } = await searchParams;
  const db = await getDb();
  const events = await upcomingEvents(db, { limit: 6 });
  const salons = (await upcomingEvents(db, { kind: "salon", limit: 3 })).filter((e) => daysUntil(e.startsOn) >= 0);
  const stats = await platformStats(db);
  const pricing = await getPricing(db);
  const top = await featuredFreelancer(db);
  const reviews = await publishedReviews(db);
  const t = await getMessages(home);
  const x = await getMessages(features);
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
          <a className="hero-more" href="#simulateur">
            {t.ctaEstimate} <span aria-hidden="true">↓</span>
          </a>
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

      <section className="section" id="simulateur" aria-labelledby="sim-title">
        <div className="section-head">
          <div>
            <span className="lab">{t.eyebrows.simulator}</span>
            <h2 className="big" id="sim-title">{t.simulator.title}</h2>
          </div>
          <p className="muted">{t.simulator.lead}</p>
        </div>
        <CostSimulator floors={pricing.floors} serviceFeeBps={pricing.serviceFeeBps} vatBps={pricing.vatBps} />
      </section>

      <section className="section" aria-labelledby="prospection-title">
        <article className="clay prospect">
          <div>
            <span className="lab">{x.landing.eyebrow}</span>
            <h2 className="big" id="prospection-title">{x.landing.title}</h2>
            <p className="muted">{x.landing.lead}</p>
            <Link className="clay btn" href="/reserver/nouveau?formule=prospection" prefetch={false}>
              {x.landing.cta}
            </Link>
          </div>
          <ul className="ticks">
            {x.landing.ticks.map((tick) => (
              <li key={tick}>
                <i className="clay s" style={{ ["--c" as string]: "#FF9F55" }} aria-hidden="true"></i>
                {tick}
              </li>
            ))}
          </ul>
        </article>
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

      {/* un seul profil, choisi dans /admin/inscrits ; rien tant qu'aucun n'est choisi */}
      {top && (
        <section className="section" aria-labelledby="top-title">
          <div className="section-head">
            <div>
              <span className="lab">{t.eyebrows.top}</span>
              <h2 className="big" id="top-title">{t.top.title}</h2>
            </div>
            <p className="muted">{t.top.lead}</p>
          </div>
          <article className="clay topcard">
            <div className="topcard-id">
              <Avatar first={top.firstName} last={top.lastInitial} color={top.avatarColor} size={88} />
              <div>
                <h3 className="disp">
                  {top.firstName}
                  {top.lastInitial ? ` ${top.lastInitial}.` : ""}
                </h3>
                <p className="muted">{[top.role ? dl.role(top.role).label : null, top.city].filter(Boolean).join(" · ")}</p>
                <span className="pill">{t.top.verified}</span>
              </div>
            </div>
            <ul className="topcard-facts">
              {top.ratingX10 > 0 && top.ratingsCount > 0 && (
                <li>
                  <b className="disp">
                    <span aria-hidden="true">★ </span>
                    {f.rating(top.ratingX10)}
                  </b>
                  <span className="muted small">{t.top.ratingOn(top.ratingsCount)}</span>
                </li>
              )}
              {top.missionsCount > 0 && (
                <li>
                  <b className="disp">{top.missionsCount.toLocaleString(f.locale)}</b>
                  <span className="muted small">{t.top.missions(top.missionsCount)}</span>
                </li>
              )}
            </ul>
            <div className="topcard-tags">
              {top.specialties.length > 0 && (
                <div>
                  <span className="lab">{t.top.specialties}</span>
                  <div className="inline" style={{ gap: 6 }}>
                    {top.specialties.slice(0, 3).map((sp) => (
                      <span key={sp} className="tag">{dl.specialty(sp)}</span>
                    ))}
                  </div>
                </div>
              )}
              {top.languages.length > 0 && (
                <div>
                  <span className="lab">{t.top.languages}</span>
                  <div className="inline" style={{ gap: 6 }}>
                    {top.languages.map((l) => (
                      <span key={l} className="tag">{dl.language(l)}</span>
                    ))}
                  </div>
                </div>
              )}
              <Link className="clay btn" href="/reserver/nouveau" prefetch={false}>
                {t.top.cta}
              </Link>
            </div>
          </article>
        </section>
      )}

      {/* avis choisis dans /admin/avis ; la société n'est nommée qu'avec son accord */}
      {reviews.length > 0 && (
        <section className="section" aria-labelledby="reviews-title">
          <div className="section-head">
            <div>
              <span className="lab">{x.reviews.eyebrow}</span>
              <h2 className="big" id="reviews-title">{x.reviews.title}</h2>
            </div>
            <p className="muted">{x.reviews.lead}</p>
          </div>
          <div className="quotes">
            {reviews.map((r) => (
              <figure key={r.id} className="clay quote">
                <span className="stars" role="img" aria-label={x.reviews.stars(r.rating)}>
                  {"★".repeat(r.rating)}
                  {"☆".repeat(5 - r.rating)}
                </span>
                <blockquote>{r.comment}</blockquote>
                <figcaption className="small">
                  <b>{r.company ?? [x.reviews.exhibitor, r.sector].filter(Boolean).join(" · ")}</b>
                  {r.event && <span className="muted"> · {r.event}</span>}
                  <br />
                  <span className="muted">{x.reviews.about(r.freelancer)}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <section className="section" aria-label={t.eyebrows.who}>
        <span className="lab">{t.eyebrows.who}</span>
        <div className="audiences">
          <article className="clay audience">
            <span className="lab">{t.companies.label}</span>
            <h3 className="disp">{t.companies.title}</h3>
            <ul className="ticks">
              {t.companies.ticks({ fee: f.percent(pricing.serviceFeeBps), freeDays: pricing.cancellation.freeDays }).map((tick) => (
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
              {t.freelancers
                .ticks({ floor: f.hourly(pricing.floors.commercial), commission: pricing.freelancerCommissionBps > 0 ? f.percent(pricing.freelancerCommissionBps) : null })
                .map((tick) => (
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
