import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { HoursRow } from "@/components/hours-row";
import { Avatar, BookingStatus, FileLink, Status } from "@/components/ui";
import { requireCompany } from "@/lib/auth/session";
import { HUBSPOT_FIELDS, ROLES, STANDARD_LEAD_COLUMNS, type RoleKey } from "@/lib/domain";
import { dateRange, euros, hoursLabel, rating } from "@/lib/format";
import { hubspotEnabled } from "@/lib/integrations/hubspot";
import { companyDashboard } from "@/lib/services/company-views";
import { formatSiret } from "@/lib/siret";
import { fileUrl } from "@/lib/storage";
import { logoutAction } from "../connexion/actions";

export const metadata = { title: "Espace entreprise" };

export default async function Page({ searchParams }: { searchParams: Promise<{ bienvenue?: string; crm?: string; email?: string }> }) {
  const { bienvenue, crm, email } = await searchParams;
  const company = await requireCompany("/entreprise");
  const db = await getDb();
  const rows = await companyDashboard(db, company.id);
  const referents = await db.select().from(s.companyReferents).where(eq(s.companyReferents.companyId, company.id));
  const [template] = await db.select().from(s.leadTemplates).where(eq(s.leadTemplates.companyId, company.id));
  const [conn] = await db.select().from(s.crmConnections).where(eq(s.crmConnections.companyId, company.id));
  const favorites = await db
    .select({ f: s.freelancers, p: s.profiles })
    .from(s.favorites)
    .innerJoin(s.freelancers, eq(s.freelancers.id, s.favorites.freelancerId))
    .innerJoin(s.profiles, eq(s.profiles.id, s.freelancers.userId))
    .where(eq(s.favorites.companyId, company.id));

  const upcoming = rows.filter((r) => ["envoyee", "partielle", "confirmee", "en_cours"].includes(r.booking.status));
  const toValidate = rows.filter((r) => r.booking.status === "heures_a_valider");
  const pendingMinutes = toValidate.flatMap((r) => r.hours.filter((h) => !h.validated)).reduce((n, h) => n + h.declared, 0);
  const leads = rows.reduce((n, r) => n + r.leads, 0);
  const columns = company.leadMode === "crm" ? HUBSPOT_FIELDS.map((f) => f.label) : company.leadMode === "standard" ? STANDARD_LEAD_COLUMNS : (template?.columns ?? []);
  const formatName = company.leadMode === "crm" ? `${company.crmProvider} · champs importés` : company.leadMode === "standard" ? "Fiche standard Standby" : (template?.name ?? "Template Excel");

  return (
    <>
      {bienvenue && <p className="note ok">Compte créé. Vous pouvez réserver votre première équipe.</p>}
      {email === "confirme" && <p className="note ok">Adresse e-mail confirmée.</p>}
      {crm === "ok" && <p className="note ok">HubSpot est connecté : les prochains leads y seront créés directement.</p>}
      {crm === "erreur" && <p className="note err">La connexion HubSpot a échoué. Réessayez ou contactez-nous.</p>}
      <div className="head">
        <div>
          <span className="lab">Espace entreprise</span>
          <h1>{company.name}</h1>
          <p>Réservations, acceptations des commerciaux, leads reçus au format de votre CRM et heures à valider.</p>
        </div>
        <div className="inline">
          <Link className="clay btn" href="/reserver/nouveau" prefetch={false}>
            Nouvelle réservation
          </Link>
          <Link className="clay s btn sm ghost" href="/compte">Mon compte</Link>
          <form action={logoutAction}>
            <button className="clay s btn sm ghost">Se déconnecter</button>
          </form>
        </div>
      </div>

      <div className="inline" style={{ gap: 18 }}>
        <div className="clay kpi"><span className="lab">Réservations à venir</span><b>{upcoming.length}</b></div>
        <div className="clay kpi"><span className="lab">Heures à valider</span><b>{hoursLabel(pendingMinutes)}</b></div>
        <div className="clay kpi"><span className="lab">Leads reçus</span><b>{leads}</b></div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 22, alignItems: "flex-start" }}>
        <div style={{ flex: "1.25 1 520px", minWidth: 0, display: "flex", flexDirection: "column", gap: 22 }}>
          <section className="clay panel">
            <h2>Vos réservations</h2>
            {rows.length === 0 && <p className="muted">Aucune réservation pour l’instant.</p>}
            {rows.map((r) => (
              <div key={r.booking.id} className="brow" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
                <div>
                  <Link className="title" href={`/entreprise/reservations/${r.booking.id}`}>
                    <b style={{ fontSize: 17 }}>{r.event?.name ?? "Événement"}</b>
                  </Link>
                  <div className="muted small">
                    {r.event?.kind === "foire" ? "Foire" : "Salon pro"} · {r.event?.city} · {r.event ? dateRange(r.event.startsOn, r.event.endsOn) : ""} · {r.people} pers. · réf. {r.booking.ref}
                  </div>
                  {r.waiting.length > 0 && ["envoyee", "partielle"].includes(r.booking.status) && (
                    <div className="muted small">En attente de {r.waiting.map((w) => w.firstName).join(", ")}</div>
                  )}
                </div>
                <div className="inline" style={{ gap: 8 }}>
                  {["envoyee", "partielle"].includes(r.booking.status) ? (
                    <Status tone="warn">Acceptations {r.accepted}/{r.people}</Status>
                  ) : (
                    <BookingStatus status={r.booking.status} />
                  )}
                  {r.leads > 0 ? (
                    <Status tone="ok">{r.leads} leads reçus</Status>
                  ) : r.booking.status === "heures_a_valider" || r.booking.status === "validee" ? (
                    <Status tone="warn">Leads attendus</Status>
                  ) : r.booking.status !== "annulee" ? (
                    <Status>Leads pendant l’événement</Status>
                  ) : null}
                  {r.booking.totalHtCents ? <b>{euros(r.booking.totalHtCents)}</b> : null}
                  {r.invoice && (
                    <Link className="small" href={`/entreprise/factures/${r.invoice.id}`}>
                      Facture {r.invoice.number}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </section>

          <section className="clay panel">
            <div className="row-between">
              <h2>Leads reçus</h2>
              <span className="muted small">{formatName}</span>
            </div>
            <p className="muted">Les commerciaux déposent leurs leads (Excel ou photos de cartes) depuis leur espace. Ils apparaissent ici, remis dans l’ordre de vos colonnes.</p>
            {rows
              .filter((r) => r.leads > 0)
              .map((r) => (
                <div key={r.booking.id} className="brow">
                  <span>
                    <b>{r.event?.name}</b> · {r.leads} lead{r.leads > 1 ? "s" : ""}
                  </span>
                  <span className="inline">
                    <Link className="clay s btn xs ghost" href={`/entreprise/reservations/${r.booking.id}#leads`}>Voir</Link>
                    <a className="clay s btn xs" href={`/entreprise/leads/${r.booking.id}/export`}>Exporter (.xlsx)</a>
                  </span>
                </div>
              ))}
          </section>

          {toValidate.map((r) => (
            <section key={r.booking.id} className="clay panel">
              <h2>Heures à valider</h2>
              <p className="muted small">
                {r.event?.name} · {r.event?.city} · {r.event ? dateRange(r.event.startsOn, r.event.endsOn) : ""} · réf. {r.booking.ref}
              </p>
              <div className="stack">
                {r.hours.map((h) => (
                  <HoursRow key={h.id} a={h} />
                ))}
              </div>
              <p className="muted small">
                Ajustez si besoin, puis validez. Sans réponse sous 3 jours, les heures déclarées sont validées. Si vous retenez moins d’heures que
                déclaré, le commercial a 48 h pour accepter ou contester ; l’équipe Standby arbitre en cas de désaccord.
              </p>
            </section>
          ))}
        </div>

        <div style={{ flex: "1 1 400px", minWidth: 0, display: "flex", flexDirection: "column", gap: 22 }}>
          <section className="clay panel">
            <div className="row-between">
              <h2>Profil entreprise</h2>
              <Link className="clay s btn xs ghost" href="/entreprise/profil">Modifier</Link>
            </div>
            <dl>
              <div className="kv"><dt>Secteur</dt><dd>{[company.sector, company.size].filter(Boolean).join(" · ") || "—"}</dd></div>
              <div className="kv"><dt>SIRET</dt><dd>{formatSiret(company.siret)} {company.siretVerified ? <Status tone="ok">Vérifié</Status> : null}</dd></div>
              <div className="kv"><dt>Site web</dt><dd>{company.website ?? "—"}</dd></div>
              <div className="kv"><dt>LinkedIn</dt><dd>{company.linkedin ?? "—"}</dd></div>
              <div className="kv"><dt>Plaquette</dt><dd>{company.brochureName ? <FileLink href={fileUrl(company.brochurePath)} name={company.brochureName} /> : "—"}</dd></div>
              <div className="kv"><dt>Leads</dt><dd>{formatName}</dd></div>
            </dl>
            <div className="chips" style={{ gap: 6 }}>
              {columns.map((c) => (
                <span key={c} className="colc">{c}</span>
              ))}
            </div>
            {company.leadMode === "crm" && (
              <div className="brow">
                <span>
                  HubSpot : <Status tone={conn?.status === "connecte" ? "ok" : "warn"}>{conn?.status === "connecte" ? "connecté" : "en attente de connexion"}</Status>
                </span>
                {conn?.status !== "connecte" && hubspotEnabled() && (
                  <a className="clay s btn xs" href="/entreprise/crm/connecter">Connecter HubSpot</a>
                )}
              </div>
            )}
            <span className="stitle">Référents</span>
            <div className="inline" style={{ gap: 12 }}>
              {referents.map((r) => {
                const [first, ...rest] = r.name.split(" ");
                return (
                  <span key={r.id} className="clay s" style={{ borderRadius: 14, padding: "8px 14px 8px 8px", display: "flex", gap: 10, alignItems: "center" }}>
                    <Avatar first={first} last={rest.join(" ")} color="#82C9FF" />
                    <span style={{ fontSize: 14 }}>
                      <b>{r.name}</b>
                      <br />
                      <span className="muted small">{[r.title, r.phone].filter(Boolean).join(" · ")}</span>
                    </span>
                  </span>
                );
              })}
            </div>
          </section>
          <section className="clay panel">
            <h2>Vos commerciaux favoris</h2>
            {favorites.length === 0 && <p className="muted small">Ajoutez des favoris avec le cœur pendant la sélection des profils : ils remontent en priorité.</p>}
            <div className="inline" style={{ gap: 12 }}>
              {favorites.map(({ f, p }) => (
                <span key={f.id} className="clay s" style={{ borderRadius: 14, padding: "8px 14px 8px 8px", display: "flex", gap: 10, alignItems: "center" }}>
                  <Avatar first={p.firstName} last={p.lastName} color={f.avatarColor} />
                  <span style={{ fontSize: 14 }}>
                    <b>{p.firstName} {p.lastName}</b>
                    <br />
                    <span className="muted small">{ROLES[f.roles[0] as RoleKey]?.short ?? ""}{f.ratingX10 ? ` · ★ ${rating(f.ratingX10)}` : ""}</span>
                  </span>
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
