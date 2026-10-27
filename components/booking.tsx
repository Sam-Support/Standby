import Link from "next/link";
import { dateRange, euros, hoursLabel, timeLabel } from "@/lib/format";
import type { Quote } from "@/lib/pricing";

const STEPS = [
  ["evenement", "Événement"],
  ["equipe", "Équipe"],
  ["brief", "Brief"],
  ["profils", "Profils"],
  ["recap", "Récap"],
] as const;

/** Stepper du parcours ; les étapes atteintes sont cliquables. */
export function Stepper({ id, current, reached }: { id: string; current: number; reached: number }) {
  const fill = Math.min(Math.max(current, reached) - 1, 4) / 4;
  return (
    <nav className="clay stepper" aria-label="Étapes de la réservation">
      <div className="tr sunk"></div>
      <div className="fl clay s" style={{ width: `calc((100% - 36px) * .8 * ${fill})` }}></div>
      {STEPS.map(([slug, label], i) => {
        const n = i + 1;
        const cls = `n${n <= Math.max(current, reached) ? " r" : ""}${n === current ? " cur" : ""}`;
        const content = (
          <>
            <i className="clay s">{n}</i>
            {label}
          </>
        );
        return n <= reached && n !== current ? (
          <Link key={slug} className={cls} href={`/reserver/${id}/${slug}`}>
            {content}
          </Link>
        ) : (
          <span key={slug} className={cls} aria-current={n === current ? "step" : undefined}>
            {content}
          </span>
        );
      })}
    </nav>
  );
}

export type AsideEvent = { name: string; kind: string; city: string; startsOn: string; endsOn: string; color: string } | null;

export function BookingAside({
  event,
  stand,
  days,
  minutesPerDay,
  startTime,
  endTime,
  people,
  companyName,
  quote,
  estimated,
  ttc,
  children,
}: {
  event: AsideEvent;
  stand?: string | null;
  days: number;
  minutesPerDay: number;
  startTime: string;
  endTime: string;
  people: number;
  companyName?: string;
  quote?: Quote | null;
  estimated?: boolean;
  ttc?: boolean;
  children?: React.ReactNode;
}) {
  const h = timeLabel;
  return (
    <aside className="clay aside" aria-label="Votre réservation">
      <span className="lab">Votre réservation</span>
      {event ? (
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span className="clay s" style={{ ["--c" as string]: event.color, width: 30, height: 30, borderRadius: "50%", flex: "none" }}></span>
          <div>
            <b>{event.name}</b>
            <p className="muted small">
              {event.kind === "salon" ? "Salon pro" : "Foire"} · {event.city} · {dateRange(event.startsOn, event.endsOn)}
              {stand ? ` · stand ${stand}` : ""}
            </p>
          </div>
        </div>
      ) : (
        <p className="muted small">Choisissez un événement.</p>
      )}
      <div className="facts">
        {days > 0 && <span>{days} jour{days > 1 ? "s" : ""}</span>}
        {minutesPerDay > 0 && (
          <span>
            {h(startTime)} – {h(endTime)} · {hoursLabel(minutesPerDay)} facturées/jour
          </span>
        )}
        {people > 0 && <span>{people} personne{people > 1 ? "s" : ""} sur le stand</span>}
        {companyName && <span>Au nom de {companyName}</span>}
      </div>
      {children}
      <div className="sunk est">
        <span className="lab">{ttc ? "Total TTC" : estimated === false ? "Total HT" : "Estimation HT"}</span>
        <b>{quote && quote.people > 0 ? euros(ttc ? quote.totalTtcCents : quote.totalHtCents) : "—"}</b>
        <p className="muted" style={{ fontSize: 12 }}>
          {quote && quote.people > 0 ? (ttc ? "TVA incluse" : "Frais de service inclus · TVA en sus") : "Ajoutez des postes à l’étape suivante."}
        </p>
      </div>
    </aside>
  );
}
