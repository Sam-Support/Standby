import Link from "@/components/link";
import { getDb } from "@/db";
import { EventArt } from "@/components/event-art";
import { EventCarousel } from "@/components/event-carousel";
import { daysUntil, eventDayCount } from "@/lib/format";
import { home } from "@/lib/i18n/messages/home";
import { getFmt, getMessages } from "@/lib/i18n/server";
import { platformStats, upcomingEvents } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ compte?: string }> }) {
  const { compte } = await searchParams;
  const db = await getDb();
  const events = await upcomingEvents(db, { limit: 6 });
  const salons = (await upcomingEvents(db, { kind: "salon", limit: 3 })).filter((e) => daysUntil(e.startsOn) >= 0);
  const stats = await platformStats(db);
  const t = await getMessages(home);
  const f = await getFmt();

  return (
    <>
      {compte === "supprime" && <p className="note ok">{t.deleted}</p>}
      <section className="hero">
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <span className="clay s lab" style={{ alignSelf: "flex-start", padding: "9px 14px", borderRadius: 14, color: "#1B2150", display: "inline-flex", gap: 8, alignItems: "center" }}>
            <span className="ball" style={{ width: 8, height: 8, background: "#68D1A4" }}></span>{t.kicker}
          </span>
          <h1 className="disp">
            {t.h1.before}{" "}
            <span className="clay" style={{ ["--c" as string]: "#FFCD4A", display: "inline-block", padding: ".02em .2em .08em", borderRadius: 12 }}>
              {t.h1.highlight}
            </span>{" "}
            {t.h1.after}
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.55, color: "#575B7E", maxWidth: "34em" }}>
            {t.lead}
          </p>
          <div className="inline" style={{ gap: 12 }}>
            <Link className="clay btn" href="/reserver/nouveau" prefetch={false}>
              {t.ctaBook}
            </Link>
            <Link className="clay btn butter" href="/inscription/commercial">
              {t.ctaFreelancer}
            </Link>
          </div>
          <div className="inline" style={{ gap: 32, marginTop: 6 }}>
            <div>
              <div className="disp" style={{ fontSize: 30 }}>{stats.freelancers.toLocaleString(f.locale)}</div>
              <div className="muted small">{t.statProfiles}</div>
            </div>
            <div>
              <div className="disp" style={{ fontSize: 30 }}>{events.length}</div>
              <div className="muted small">{t.statEvents}</div>
            </div>
            {stats.ratingX10 > 0 && (
              <div>
                <div className="disp" style={{ fontSize: 30 }}>{f.rating(stats.ratingX10)}/5</div>
                <div className="muted small">{t.statRating}</div>
              </div>
            )}
          </div>
          {stats.verifiedOn && <p className="muted" style={{ fontSize: 12 }}>{t.verified(f.longDate(stats.verifiedOn))}</p>}
        </div>
        <EventCarousel events={events} />
      </section>

      <section className="section" style={{ gap: 26 }}>
        <div className="row-between" style={{ alignItems: "flex-end" }}>
          <h2 className="big">{t.stepsTitle}</h2>
          <p className="muted" style={{ maxWidth: "36em" }}>
            {t.stepsLead}
          </p>
        </div>
        <div className="grid3" style={{ gap: 22 }}>
          {["#4D58EE", "#FF8CB6", "#68D1A4"].map((c, i) => [c, String(i + 1), ...t.steps[i]]).map(([c, n, title, d]) => (
            <article key={n} className="clay" style={{ borderRadius: 22, padding: 26, display: "flex", flexDirection: "column", gap: 12 }}>
              <span className="clay s disp" style={{ ["--c" as string]: c, color: n === "1" ? "#fff" : undefined, width: 50, height: 50, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 22 }}>
                {n}
              </span>
              <h3 style={{ font: "800 20px/1.2 var(--sans)" }}>{title}</h3>
              <p className="muted">{d}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="row-between" style={{ alignItems: "flex-end" }}>
          <h2 className="big">{t.nextTitle}</h2>
          <p className="muted" style={{ maxWidth: "34em" }}>
            {t.nextLead}
          </p>
        </div>
        <div className="grid3">
          {salons.map((e) => {
            const inDays = daysUntil(e.startsOn);
            return (
              <div key={e.id} className="clay" style={{ borderRadius: 22, padding: "12px 12px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
                <EventArt logoUrl={e.logoUrl} name={e.name} ratio="26/10" />
                <div style={{ padding: "0 8px", display: "flex", flexDirection: "column", gap: 6 }}>
                  <div className="row-between">
                    <span className="pill">{t.salonPro}</span>
                    <span className="muted small">{inDays > 0 ? t.inDays(inDays) : t.ongoing}</span>
                  </div>
                  <h3 style={{ font: "800 18px/1.25 var(--sans)" }}>{e.name}</h3>
                  <p className="muted" style={{ fontSize: 14 }}>
                    {e.city} · {f.dateRange(e.startsOn, e.endsOn)} · {t.days(eventDayCount(e.startsOn, e.endsOn))}
                  </p>
                  <div className="inline" style={{ gap: 6 }}>
                    <span className="tag">{e.sector}</span>
                    <span className="tag">{t.available(e.available)}</span>
                  </div>
                </div>
                <Link className="clay s btn sm" style={{ margin: "6px 8px 0" }} href={`/reserver/nouveau?salon=${e.slug}`} prefetch={false}>
                  {t.staff}
                </Link>
              </div>
            );
          })}
          {salons.length === 0 && <p className="muted">{t.soon}</p>}
        </div>
      </section>

      <section className="grid2" style={{ paddingTop: 34 }}>
        <article className="clay" style={{ borderRadius: 24, padding: 32, display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start" }}>
          <span className="lab">{t.companies.label}</span>
          <h3 className="disp" style={{ fontSize: 30, lineHeight: 1.1 }}>{t.companies.title}</h3>
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
        <article className="clay" style={{ ["--c" as string]: "#F3EBD4", borderRadius: 24, padding: 32, display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start" }}>
          <span className="lab">{t.freelancers.label}</span>
          <h3 className="disp" style={{ fontSize: 30, lineHeight: 1.1 }}>{t.freelancers.title}</h3>
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
      </section>
    </>
  );
}
