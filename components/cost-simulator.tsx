"use client";

import { useState } from "react";
import { RoleQtyRow } from "@/components/booking";
import Link from "@/components/link";
import { ROLES, ROLE_KEYS, type RoleKey } from "@/lib/domain";
import { home } from "@/lib/i18n/messages/home";
import { hasBreak, simulateQuote } from "@/lib/pricing";
import { useFmt, useMessages } from "./i18n";

const MAX_DAYS = 15;
const MAIN_ROLES = ROLE_KEYS.filter((r) => !ROLES[r].rare);
const RARE_ROLES = ROLE_KEYS.filter((r) => ROLES[r].rare);

/**
 * Simulateur de la page d'accueil : postes, jours et horaires donnent une estimation « à partir de », avec les
 * tarifs planchers et les frais de service en vigueur (même calcul que le devis d'une réservation).
 */
export function CostSimulator({ floors, serviceFeeBps, vatBps }: { floors: Record<RoleKey, number>; serviceFeeBps: number; vatBps: number }) {
  const t = useMessages(home).simulator;
  const f = useFmt();
  const [qty, setQty] = useState<Partial<Record<RoleKey, number>>>({ commercial: 2, accueil: 1 });
  const [days, setDays] = useState(3);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");

  const quote = simulateQuote({ qty, days, startTime, endTime, floors, serviceFeeBps, vatBps });
  const minutes = quote.billableMinutesPerDay;
  const ready = quote.people > 0 && minutes > 0;
  const row = (r: RoleKey) => <RoleQtyRow key={r} role={r} qty={qty[r] ?? 0} floorCents={floors[r]} idPrefix="sim" onChange={(n) => setQty({ ...qty, [r]: n })} />;

  return (
    <div className="sim">
      <div className="clay sim-form">
        <h3 className="ptitle">{t.team}</h3>
        <div className="stack">{MAIN_ROLES.map(row)}</div>
        <details className="sunk more">
          <summary>{t.rare}</summary>
          <div className="stack" style={{ padding: "6px 2px 2px" }}>
            {RARE_ROLES.map(row)}
          </div>
        </details>

        <h3 className="ptitle">{t.duration}</h3>
        <div className="sim-when">
          <div className="row">
            <b id="sim-days" style={{ flex: 1 }}>
              {t.days}
            </b>
            <button type="button" className="clay s qb" disabled={days <= 1} onClick={() => setDays(days - 1)} aria-label={t.lessDays}>
              −
            </button>
            <span className="disp" style={{ fontSize: 22, minWidth: 28, textAlign: "center" }} aria-live="polite" aria-labelledby="sim-days">
              {days}
            </span>
            <button type="button" className="clay s qb" disabled={days >= MAX_DAYS} onClick={() => setDays(days + 1)} aria-label={t.moreDays}>
              +
            </button>
          </div>
          <label className="field">
            {t.start}
            <input className="input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </label>
          <label className="field">
            {t.end}
            <input className="input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </label>
        </div>
        <p className="muted small">{minutes > 0 ? t.billed(f.hoursLabel(minutes), hasBreak(startTime, endTime)) : t.badHours}</p>
      </div>

      <aside className="clay sim-result" aria-label={t.result}>
        <span className="lab">{t.result}</span>
        <div className="sunk est" aria-live="polite">
          <span className="lab">{t.from}</span>
          <b data-testid="sim-total">{ready ? f.euros(quote.totalHtCents) : "—"}</b>
          <p className="muted" style={{ fontSize: 12 }}>
            {ready ? t.htNote : quote.people === 0 ? t.empty : t.badHours}
          </p>
        </div>
        {ready && (
          <dl className="sim-lines">
            <div>
              <dt>{t.staff(quote.people, days)}</dt>
              <dd>{f.euros(quote.subtotalCents)}</dd>
            </div>
            <div>
              <dt>{t.fee(f.percent(serviceFeeBps))}</dt>
              <dd>{f.euros(quote.serviceFeeCents)}</dd>
            </div>
            <div>
              <dt>{t.ttc}</dt>
              <dd>{f.euros(quote.totalTtcCents)}</dd>
            </div>
          </dl>
        )}
        <p className="muted small">{t.floorNote}</p>
        <Link className="clay btn" href="/reserver/nouveau" prefetch={false}>
          {t.cta}
        </Link>
      </aside>
    </div>
  );
}
