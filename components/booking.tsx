"use client";

import Link from "@/components/link";
import { ROLES, type RoleKey } from "@/lib/domain";
import { booking } from "@/lib/i18n/messages/booking";
import { domainLabels } from "@/lib/i18n/messages/domain";
import type { Quote } from "@/lib/pricing";
import { useFmt, useMessages } from "./i18n";

/**
 * Compteur d'un poste (« 2 × Commercial·e de stand ») : formulaire d'équipe de la réservation et simulateur de
 * la page d'accueil. `name` ajoute le champ caché envoyé avec le formulaire.
 */
export function RoleQtyRow({
  role,
  qty,
  floorCents,
  onChange,
  name,
  max = 20,
  idPrefix = "l",
}: {
  role: RoleKey;
  qty: number;
  floorCents: number;
  onChange: (qty: number) => void;
  name?: string;
  max?: number;
  idPrefix?: string;
}) {
  const t = useMessages(booking).team;
  const f = useFmt();
  const label = domainLabels(f.lang).role(role);
  const id = `${idPrefix}-${role}`;
  return (
    <div className={`row${qty === 0 ? " off" : ""}`}>
      <span className="clay s" style={{ ["--c" as string]: ROLES[role].color, width: 36, height: 36, borderRadius: "50%", flex: "none" }} aria-hidden="true"></span>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 180 }}>
        <b id={id}>{label.label}</b>
        <span className="muted small">
          {t.from(f.hourly(floorCents))} · {label.desc}
        </span>
      </div>
      <button type="button" className="clay s qb" disabled={qty === 0} onClick={() => onChange(qty - 1)} aria-label={t.remove(label.label)}>
        −
      </button>
      <span className="disp" style={{ fontSize: 22, minWidth: 28, textAlign: "center" }} aria-live="polite" aria-labelledby={id}>
        {qty}
      </span>
      <button type="button" className="clay s qb" disabled={qty >= max} onClick={() => onChange(qty + 1)} aria-label={t.add(label.label)}>
        +
      </button>
      {name && <input type="hidden" name={name} value={qty} />}
    </div>
  );
}

const STEPS = ["evenement", "equipe", "brief", "profils", "recap"] as const;

/** Stepper du parcours ; les étapes atteintes sont cliquables. */
export function Stepper({ id, current, reached }: { id: string; current: number; reached: number }) {
  const t = useMessages(booking).steps;
  const fill = Math.min(Math.max(current, reached) - 1, 4) / 4;
  return (
    <nav className="clay stepper" aria-label={t.nav}>
      <div className="tr sunk"></div>
      <div className="fl clay s" style={{ width: `calc((100% - 36px) * .8 * ${fill})` }}></div>
      {STEPS.map((slug, i) => {
        const n = i + 1;
        const cls = `n${n <= Math.max(current, reached) ? " r" : ""}${n === current ? " cur" : ""}`;
        const content = (
          <>
            <i className="clay s">{n}</i>
            {t.labels[i]}
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
  const m = useMessages(booking);
  const t = m.aside;
  const f = useFmt();
  return (
    <aside className="clay aside" aria-label={t.title}>
      <span className="lab">{t.title}</span>
      {event ? (
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span className="clay s" style={{ ["--c" as string]: event.color, width: 30, height: 30, borderRadius: "50%", flex: "none" }}></span>
          <div>
            <b>{event.name}</b>
            <p className="muted small">
              {event.kind === "salon" ? m.kind.salon : m.kind.foire} · {event.city} · {f.dateRange(event.startsOn, event.endsOn)}
              {stand ? ` · ${t.stand(stand)}` : ""}
            </p>
          </div>
        </div>
      ) : (
        <p className="muted small">{t.choose}</p>
      )}
      <div className="facts">
        {days > 0 && <span>{t.days(days)}</span>}
        {minutesPerDay > 0 && (
          <span>
            {f.timeLabel(startTime)} – {f.timeLabel(endTime)} · {t.billed(f.hoursLabel(minutesPerDay))}
          </span>
        )}
        {people > 0 && <span>{t.people(people)}</span>}
        {companyName && <span>{t.onBehalf(companyName)}</span>}
      </div>
      {children}
      <div className="sunk est">
        <span className="lab">{ttc ? t.ttc : estimated === false ? t.ht : t.estimate}</span>
        <b>{quote && quote.people > 0 ? f.euros(ttc ? quote.totalTtcCents : quote.totalHtCents) : "—"}</b>
        <p className="muted" style={{ fontSize: 12 }}>
          {quote && quote.people > 0 ? (ttc ? t.vatIncluded : t.feesIncluded) : t.addRoles}
        </p>
      </div>
    </aside>
  );
}
