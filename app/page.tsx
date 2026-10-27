import Link from "next/link";
import { getDb } from "@/db";
import { EventArt } from "@/components/event-art";
import { EventCarousel } from "@/components/event-carousel";
import { dateRange, daysUntil, eventDayCount, longDate, rating } from "@/lib/format";
import { platformStats, upcomingEvents } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const db = await getDb();
  const events = await upcomingEvents(db, { limit: 6 });
  const salons = (await upcomingEvents(db, { kind: "salon", limit: 3 })).filter((e) => daysUntil(e.startsOn) >= 0);
  const stats = await platformStats(db);

  return (
    <>
      <section className="hero">
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <span className="clay s lab" style={{ alignSelf: "flex-start", padding: "9px 14px", borderRadius: 14, color: "#1B2150", display: "inline-flex", gap: 8, alignItems: "center" }}>
            <span className="ball" style={{ width: 8, height: 8, background: "#68D1A4" }}></span>Salons pros &amp; foires · Paris · Lyon · Cannes · International
          </span>
          <h1 className="disp">
            Votre stand,{" "}
            <span className="clay" style={{ ["--c" as string]: "#FFCD4A", display: "inline-block", padding: ".02em .2em .08em", borderRadius: 12 }}>
              staffé
            </span>{" "}
            avant l’ouverture des portes.
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.55, color: "#575B7E", maxWidth: "34em" }}>
            Commerciaux, hôtes·ses, animateurs et interprètes vérifiés pour vos salons professionnels et vos foires. Composez votre équipe en trois
            minutes : contrats, badges, remontée des leads dans votre CRM et paie sont gérés pour vous.
          </p>
          <div className="inline" style={{ gap: 12 }}>
            <Link className="clay btn" href="/reserver/nouveau" prefetch={false}>
              Réserver mon équipe
            </Link>
            <Link className="clay btn butter" href="/inscription/commercial">
              Je suis commercial·e
            </Link>
          </div>
          <div className="inline" style={{ gap: 32, marginTop: 6 }}>
            <div>
              <div className="disp" style={{ fontSize: 30 }}>{stats.freelancers.toLocaleString("fr-FR")}</div>
              <div className="muted small">profils vérifiés</div>
            </div>
            <div>
              <div className="disp" style={{ fontSize: 30 }}>{events.length}</div>
              <div className="muted small">événements à venir</div>
            </div>
            {stats.ratingX10 > 0 && (
              <div>
                <div className="disp" style={{ fontSize: 30 }}>{rating(stats.ratingX10)}/5</div>
                <div className="muted small">note moyenne des profils</div>
              </div>
            )}
          </div>
          {stats.verifiedOn && <p className="muted" style={{ fontSize: 12 }}>Calendrier des salons et foires, dates vérifiées le {longDate(stats.verifiedOn)}.</p>}
        </div>
        <EventCarousel events={events} />
      </section>

      <section className="section" style={{ gap: 26 }}>
        <div className="row-between" style={{ alignItems: "flex-end" }}>
          <h2 className="big">Trois étapes, zéro tableur</h2>
          <p className="muted" style={{ maxWidth: "36em" }}>
            Le parcours reprend ce qui marche sur les plateformes d’extras, adapté aux salons et aux foires : montage la veille, badges, tenues
            prêtées, leads au format de votre CRM.
          </p>
        </div>
        <div className="grid3" style={{ gap: 22 }}>
          {[
            ["#4D58EE", "1", "Choisissez votre événement", "Salon professionnel ou foire grand public, jours d’ouverture (montage compris) et horaires de votre stand."],
            ["#FF8CB6", "2", "Composez et briefez l’équipe", "Postes, langues, tenue, référent sur place, plaquette. Le matching propose des commerciaux notés par d’autres exposants."],
            ["#68D1A4", "3", "Recevez vos leads, validez", "Les commerciaux déposent leurs leads au format de votre CRM. Vous validez les heures, la paie part le lundi."],
          ].map(([c, n, t, d]) => (
            <article key={n} className="clay" style={{ borderRadius: 22, padding: 26, display: "flex", flexDirection: "column", gap: 12 }}>
              <span className="clay s disp" style={{ ["--c" as string]: c, color: n === "1" ? "#fff" : undefined, width: 50, height: 50, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 22 }}>
                {n}
              </span>
              <h3 style={{ font: "800 20px/1.2 var(--sans)" }}>{t}</h3>
              <p className="muted">{d}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="row-between" style={{ alignItems: "flex-end" }}>
          <h2 className="big">Prochains salons à staffer</h2>
          <p className="muted" style={{ maxWidth: "34em" }}>
            Un clic pour lancer la réservation d’une équipe pour l’événement de votre choix.
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
                    <span className="pill">Salon pro</span>
                    <span className="muted small">{inDays > 0 ? `dans ${inDays} jour${inDays > 1 ? "s" : ""}` : "en cours"}</span>
                  </div>
                  <h3 style={{ font: "800 18px/1.25 var(--sans)" }}>{e.name}</h3>
                  <p className="muted" style={{ fontSize: 14 }}>
                    {e.city} · {dateRange(e.startsOn, e.endsOn)} · {eventDayCount(e.startsOn, e.endsOn)} jours
                  </p>
                  <div className="inline" style={{ gap: 6 }}>
                    <span className="tag">{e.sector}</span>
                    <span className="tag">{e.available} profils dispo</span>
                  </div>
                </div>
                <Link className="clay s btn sm" style={{ margin: "6px 8px 0" }} href={`/reserver/nouveau?salon=${e.slug}`} prefetch={false}>
                  Staffer ce salon
                </Link>
              </div>
            );
          })}
          {salons.length === 0 && <p className="muted">Le calendrier des prochains salons arrive bientôt.</p>}
        </div>
      </section>

      <section className="grid2" style={{ paddingTop: 34 }}>
        <article className="clay" style={{ borderRadius: 24, padding: 32, display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start" }}>
          <span className="lab">Entreprises exposantes</span>
          <h3 className="disp" style={{ fontSize: 30, lineHeight: 1.1 }}>Un stand complet, même la veille</h3>
          <ul className="ticks">
            {[
              "Profils vérifiés : identité, SIRET et références d’anciens exposants.",
              "Votre plaquette et votre référent transmis à l’équipe avant le salon.",
              "Leads remontés dans votre template Excel ou directement dans votre CRM.",
              "Validation des heures et une seule facture par événement.",
            ].map((t) => (
              <li key={t}>
                <i className="clay s" aria-hidden="true"></i>
                {t}
              </li>
            ))}
          </ul>
          <Link className="clay btn" href="/inscription/entreprise">
            Créer mon compte entreprise
          </Link>
        </article>
        <article className="clay" style={{ ["--c" as string]: "#F3EBD4", borderRadius: 24, padding: 32, display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start" }}>
          <span className="lab">Commerciaux</span>
          <h3 className="disp" style={{ fontSize: 30, lineHeight: 1.1 }}>Des missions salons à votre rythme</h3>
          <ul className="ticks">
            {[
              "Missions dans vos spécialités, tarif horaire affiché avant de postuler.",
              "Tenue prêtée à votre taille quand l’exposant en fournit une.",
              "Dépôt des leads en un geste : fichier Excel ou photos de cartes de visite.",
              "Virement chaque lundi pour la semaine travaillée.",
            ].map((t) => (
              <li key={t}>
                <i className="clay s" style={{ ["--c" as string]: "#1C8755" }} aria-hidden="true"></i>
                {t}
              </li>
            ))}
          </ul>
          <Link className="clay btn butter" href="/inscription/commercial">
            Créer mon compte commercial
          </Link>
        </article>
      </section>
    </>
  );
}
