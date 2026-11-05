import Link from "@/components/link";
import { getFmt, getLang, getMessages } from "@/lib/i18n/server";
import { booking } from "@/lib/i18n/messages/booking";
import { domainLabels } from "@/lib/i18n/messages/domain";
import { localizePath } from "@/lib/i18n/config";
import { redirect } from "next/navigation";
import { schema as s } from "@/db";
import { eq } from "drizzle-orm";
import { ActionForm, Submit } from "@/components/action-form";
import { BookingAside, Stepper } from "@/components/booking";
import { Avatar, PageHead, Status } from "@/components/ui";
import { isRoleKey, languageCode, type RoleKey } from "@/lib/domain";
import { billableMinutesPerDay } from "@/lib/pricing";
import { findCandidates } from "@/lib/services/booking";
import { reselect, toggleFav, toggleProfile } from "../../actions";
import { loadDraft, reachedStep } from "../data";

export async function generateMetadata() {
  return { title: (await getMessages(booking)).meta.profiles };
}

type CardData = {
  id: string;
  firstName: string;
  lastName: string;
  city: string;
  ratingX10: number;
  missionsCount: number;
  hourlyRateCents: number;
  specialties: string[];
  languages: string[];
  topSize: string | null;
  pantsSize: string | null;
  shoeSize: string | null;
  avatarColor: string;
  score: number;
  selected: boolean;
  favorite: boolean;
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await loadDraft(id, "profils");
  if (!d.event) redirect(localizePath(`/reserver/${id}/evenement`, await getLang()));
  if (d.positions.length === 0) redirect(localizePath(`/reserver/${id}/equipe`, await getLang()));
  const favs = new Set((await d.db.select().from(s.favorites).where(eq(s.favorites.companyId, d.company.id))).map((f) => f.freelancerId));
  const taken = d.assignments.map((a) => a.freelancerId);

  const sections = [];
  for (const p of d.positions) {
    if (!isRoleKey(p.role)) continue;
    const role = p.role as RoleKey;
    const selected: CardData[] = d.assignments
      .filter((a) => a.role === role)
      .map((a) => ({ ...a, id: a.freelancerId, score: a.matchScore, selected: true, favorite: favs.has(a.freelancerId) }))
      .sort((x, y) => y.score - x.score || y.ratingX10 - x.ratingX10 || x.id.localeCompare(y.id));
    const candidates = (await findCandidates(d.db, d.booking, role, taken))
      .slice(0, Math.max(3, 6 - selected.length))
      .map((c) => ({ ...c, selected: false, favorite: c.isFavorite }));
    sections.push({ role, qty: p.qty, cards: [...selected, ...candidates] });
  }
  const allFilled = sections.every((sec) => sec.cards.filter((c) => c.selected).length >= sec.qty);

  const m = await getMessages(booking);
  const t = m.profiles;
  const f = await getFmt();
  const dl = domainLabels(f.lang);
  return (
    <>
      <PageHead label={m.head.label} title={m.head.title}>
        {m.head.lead}
      </PageHead>
      <Stepper id={id} current={4} reached={reachedStep(d)} />
      <div className="layout">
        <section className="clay main">
          <div className="row-between">
            <h2 className="ptitle">{t.title}</h2>
            <ActionForm action={reselect.bind(null, id)}>
              <Submit className="clay s btn sm ghost" pending={t.reselecting}>
                {t.reselect}
              </Submit>
            </ActionForm>
          </div>
          <p className="muted">
            {t.leadBefore}
            <b>{dl.specialty(d.event.specialty ?? d.event.sector)}</b>
            {t.leadAfter}
          </p>
          {sections.map((sec) => {
            const n = sec.cards.filter((c) => c.selected).length;
            return (
              <section key={sec.role} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="row-between">
                  <h3 style={{ font: "800 16px var(--sans)" }}>{dl.role(sec.role).label}</h3>
                  <Status tone={n >= sec.qty ? "ok" : "warn"}>
                    {t.selectedCount(n, sec.qty)}
                  </Status>
                </div>
                {sec.cards.length === 0 && <p className="note">{t.none}</p>}
                <div className="tgrid">
                  {sec.cards.map((c) => (
                    <article key={c.id} className={`clay tc${c.selected ? " on" : ""}`}>
                      <div className="top">
                        <Avatar first={c.firstName} last={c.lastName} color={sec.role === "accueil" ? "#FF8CB6" : c.avatarColor} size={54} />
                        <span className="match">{t.match(c.score)}</span>
                        <ActionForm action={toggleFav.bind(null, id, c.id)} style={{ marginLeft: "auto" }}>
                          <button className={`fav${c.favorite ? " is" : ""}`} aria-pressed={c.favorite} aria-label={c.favorite ? t.unfav(c.firstName) : t.fav(c.firstName)}>
                            {c.favorite ? "♥" : "♡"}
                          </button>
                        </ActionForm>
                      </div>
                      <h3>
                        {c.firstName} {c.lastName}
                      </h3>
                      <span className="muted small">
                        {dl.role(sec.role).short} · {c.city}
                      </span>
                      <div className="stats">
                        {c.ratingX10 > 0 && <span>★ {f.rating(c.ratingX10)}</span>}
                        <span>{t.events(c.missionsCount)}</span>
                        <span>{f.hourly(c.hourlyRateCents)}</span>
                      </div>
                      <div className="langs">
                        {c.specialties.slice(0, 2).map((sp) => (
                          <span key={sp} className={`lang spec${sp === d.event!.specialty ? " hit" : ""}`}>{dl.specialty(sp)}</span>
                        ))}
                      </div>
                      <div className="langs">
                        {c.languages.map((l) => (
                          <span key={l} className={`lang${d.booking.languages.includes(l) ? " hit" : ""}`} title={dl.language(l)}>{languageCode(l)}</span>
                        ))}
                      </div>
                      <span className="muted small">
                        {t.outfit([c.topSize, c.pantsSize, c.shoeSize ? t.shoe(c.shoeSize) : null].filter(Boolean).join(" · "))}
                      </span>
                      <ActionForm action={toggleProfile.bind(null, id, c.id, sec.role)}>
                        <Submit className={c.selected ? "clay s btn sm" : "clay s btn sm ghost"} pending="…">
                          {c.selected ? t.selected : t.select}
                        </Submit>
                      </ActionForm>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
          <div className="nav-row">
            <Link className="clay btn ghost" href={`/reserver/${id}/brief`}>
              {m.back}
            </Link>
            {allFilled ? (
              <Link className="clay btn" href={`/reserver/${id}/recap`}>
                {t.next}
              </Link>
            ) : (
              <span className="clay btn" aria-disabled="true" title={t.complete}>
                {t.next}
              </span>
            )}
          </div>
        </section>
        <BookingAside
          event={d.event}
          stand={d.booking.stand}
          days={d.booking.days.length}
          minutesPerDay={billableMinutesPerDay(d.booking.startTime, d.booking.endTime)}
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
