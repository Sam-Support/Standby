import Link from "@/components/link";
import { eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { HoursRow } from "@/components/hours-row";
import { Avatar, BookingStatus, FileLink, Status } from "@/components/ui";
import { requireCompany } from "@/lib/auth/session";
import { HUBSPOT_FIELDS, STANDARD_LEAD_COLUMNS } from "@/lib/domain";
import { booking as bookingMessages } from "@/lib/i18n/messages/booking";
import { company as messages } from "@/lib/i18n/messages/company";
import { domainLabels } from "@/lib/i18n/messages/domain";
import { getFmt, getMessages } from "@/lib/i18n/server";
import { hubspotEnabled } from "@/lib/integrations/hubspot";
import { companyDashboard } from "@/lib/services/company-views";
import { formatSiret } from "@/lib/siret";
import { fileUrl } from "@/lib/storage";
import { logoutAction } from "../connexion/actions";

export async function generateMetadata() {
  return { title: (await getMessages(messages)).area };
}

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

  const m = await getMessages(messages);
  const t = m.dash;
  const kind = (await getMessages(bookingMessages)).kind;
  const lf = (await getMessages(bookingMessages)).leadFormats;
  const f = await getFmt();
  const dl = domainLabels(f.lang);

  const upcoming = rows.filter((r) => ["envoyee", "partielle", "confirmee", "en_cours"].includes(r.booking.status));
  const toValidate = rows.filter((r) => r.booking.status === "heures_a_valider");
  const pendingMinutes = toValidate.flatMap((r) => r.hours.filter((h) => !h.validated && !h.pending)).reduce((n, h) => n + h.declared, 0);
  const leads = rows.reduce((n, r) => n + r.leads, 0);
  const columns =
    company.leadMode === "crm" ? HUBSPOT_FIELDS.map((x) => x.label) : company.leadMode === "standard" ? STANDARD_LEAD_COLUMNS.map(dl.leadColumn) : (template?.columns ?? []);
  const formatName =
    company.leadMode === "crm" ? lf.crm(company.crmProvider ?? "CRM") : company.leadMode === "standard" ? lf.standard : (template?.name ?? t.excelTemplate);

  return (
    <>
      {bienvenue && <p className="note ok">{t.welcome}</p>}
      {email === "confirme" && <p className="note ok">{t.emailConfirmed}</p>}
      {crm === "ok" && <p className="note ok">{t.crmOk}</p>}
      {crm === "erreur" && <p className="note err">{t.crmError}</p>}
      <div className="head">
        <div>
          <span className="lab">{m.area}</span>
          <h1>{company.name}</h1>
          <p>{t.lead}</p>
        </div>
        <div className="inline">
          <Link className="clay btn" href="/reserver/nouveau" prefetch={false}>
            {t.newBooking}
          </Link>
          <Link className="clay s btn sm ghost" href="/compte">
            {t.myAccount}
          </Link>
          <form action={logoutAction}>
            <button className="clay s btn sm ghost">{t.logout}</button>
          </form>
        </div>
      </div>

      <div className="inline" style={{ gap: 18 }}>
        <div className="clay kpi"><span className="lab">{t.kpiUpcoming}</span><b>{upcoming.length}</b></div>
        <div className="clay kpi"><span className="lab">{t.kpiHours}</span><b>{f.hoursLabel(pendingMinutes)}</b></div>
        <div className="clay kpi"><span className="lab">{t.kpiLeads}</span><b>{leads}</b></div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 22, alignItems: "flex-start" }}>
        <div style={{ flex: "1.25 1 520px", minWidth: 0, display: "flex", flexDirection: "column", gap: 22 }}>
          <section className="clay panel">
            <h2>{t.bookings}</h2>
            {rows.length === 0 && <p className="muted">{t.none}</p>}
            {rows.map((r) => (
              <div key={r.booking.id} className="brow" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
                <div>
                  <Link className="title" href={`/entreprise/reservations/${r.booking.id}`}>
                    <b style={{ fontSize: 17 }}>{r.event?.name ?? t.event}</b>
                  </Link>
                  <div className="muted small">
                    {r.event?.kind === "foire" ? kind.foire : kind.salon} · {r.event?.city} · {r.event ? f.dateRange(r.event.startsOn, r.event.endsOn) : ""} ·{" "}
                    {t.people(r.people)} · {t.ref(r.booking.ref)}
                  </div>
                  {r.waiting.length > 0 && ["envoyee", "partielle"].includes(r.booking.status) && (
                    <div className="muted small">{t.waiting(r.waiting.map((w) => w.firstName).join(", "))}</div>
                  )}
                </div>
                <div className="inline" style={{ gap: 8 }}>
                  {["envoyee", "partielle"].includes(r.booking.status) ? (
                    <Status tone="warn">{t.acceptances(r.accepted, r.people)}</Status>
                  ) : (
                    <BookingStatus status={r.booking.status} />
                  )}
                  {r.leads > 0 ? (
                    <Status tone="ok">{t.leadsReceived(r.leads)}</Status>
                  ) : r.booking.status === "heures_a_valider" || r.booking.status === "validee" ? (
                    <Status tone="warn">{t.leadsExpected}</Status>
                  ) : r.booking.status !== "annulee" ? (
                    <Status>{t.leadsDuring}</Status>
                  ) : null}
                  {r.booking.totalHtCents ? <b>{f.euros(r.booking.totalHtCents)}</b> : null}
                  {r.invoice && (
                    <Link className="small" href={`/entreprise/factures/${r.invoice.id}`}>
                      {t.invoice(r.invoice.number)}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </section>

          <section className="clay panel">
            <div className="row-between">
              <h2>{t.leadsTitle}</h2>
              <span className="muted small">{formatName}</span>
            </div>
            <p className="muted">{t.leadsLead}</p>
            {rows
              .filter((r) => r.leads > 0)
              .map((r) => (
                <div key={r.booking.id} className="brow">
                  <span>
                    <b>{r.event?.name}</b> · {t.leadCount(r.leads)}
                  </span>
                  <span className="inline">
                    <Link className="clay s btn xs ghost" href={`/entreprise/reservations/${r.booking.id}#leads`}>
                      {t.see}
                    </Link>
                    <a className="clay s btn xs" href={`/entreprise/leads/${r.booking.id}/export`}>
                      {t.export}
                    </a>
                  </span>
                </div>
              ))}
          </section>

          {toValidate.map((r) => (
            <section key={r.booking.id} className="clay panel">
              <h2>{t.hoursTitle}</h2>
              <p className="muted small">
                {r.event?.name} · {r.event?.city} · {r.event ? f.dateRange(r.event.startsOn, r.event.endsOn) : ""} · {t.ref(r.booking.ref)}
              </p>
              <div className="stack">
                {r.hours.map((h) => (
                  <HoursRow key={h.id} a={h} />
                ))}
              </div>
              <p className="muted small">{t.hoursHelp}</p>
            </section>
          ))}
        </div>

        <div style={{ flex: "1 1 400px", minWidth: 0, display: "flex", flexDirection: "column", gap: 22 }}>
          <section className="clay panel">
            <div className="row-between">
              <h2>{t.profile}</h2>
              <Link className="clay s btn xs ghost" href="/entreprise/profil">
                {t.edit}
              </Link>
            </div>
            <dl>
              <div className="kv"><dt>{t.sector}</dt><dd>{[company.sector, company.size ? dl.size(company.size) : null].filter(Boolean).join(" · ") || "—"}</dd></div>
              <div className="kv"><dt>SIRET</dt><dd>{formatSiret(company.siret)} {company.siretVerified ? <Status tone="ok">{t.verified}</Status> : <Status tone="info">{t.checking}</Status>}</dd></div>
              <div className="kv"><dt>{t.website}</dt><dd>{company.website ?? "—"}</dd></div>
              <div className="kv"><dt>LinkedIn</dt><dd>{company.linkedin ?? "—"}</dd></div>
              <div className="kv"><dt>{t.brochure}</dt><dd>{company.brochureName ? <FileLink href={fileUrl(company.brochurePath)} name={company.brochureName} /> : "—"}</dd></div>
              <div className="kv"><dt>{t.leads}</dt><dd>{formatName}</dd></div>
            </dl>
            <div className="chips" style={{ gap: 6 }}>
              {columns.map((c) => (
                <span key={c} className="colc">{c}</span>
              ))}
            </div>
            {company.leadMode === "crm" && (
              <div className="brow">
                <span>
                  HubSpot : <Status tone={conn?.status === "connecte" ? "ok" : "warn"}>{conn?.status === "connecte" ? t.hubspotConnected : t.hubspotPending}</Status>
                </span>
                {conn?.status !== "connecte" && hubspotEnabled() && (
                  <a className="clay s btn xs" href="/entreprise/crm/connecter">
                    {t.connectHubspot}
                  </a>
                )}
              </div>
            )}
            <span className="stitle">{t.referents}</span>
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
            <h2>{t.favorites}</h2>
            {favorites.length === 0 && <p className="muted small">{t.noFavorites}</p>}
            <div className="inline" style={{ gap: 12 }}>
              {favorites.map(({ f: fr, p }) => (
                <span key={fr.id} className="clay s" style={{ borderRadius: 14, padding: "8px 14px 8px 8px", display: "flex", gap: 10, alignItems: "center" }}>
                  <Avatar first={p.firstName} last={p.lastName} color={fr.avatarColor} />
                  <span style={{ fontSize: 14 }}>
                    <b>{p.firstName} {p.lastName}</b>
                    <br />
                    <span className="muted small">
                      {fr.roles[0] ? dl.role(fr.roles[0]).short : ""}
                      {fr.ratingX10 ? ` · ★ ${f.rating(fr.ratingX10)}` : ""}
                    </span>
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
