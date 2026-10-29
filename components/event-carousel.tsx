"use client";

import Link from "@/components/link";
import { useState } from "react";
import { dayNumbers, daysUntil, eventDayCount } from "@/lib/format";
import { domainLabels } from "@/lib/i18n/messages/domain";
import { home } from "@/lib/i18n/messages/home";
import { useFmt, useLang, useMessages } from "./i18n";
import type { EventCard } from "@/lib/queries";
import { EventArt } from "./event-art";

export function EventCarousel({ events }: { events: EventCard[] }) {
  const [i, setI] = useState(0);
  const all = useMessages(home);
  const t = all.carousel;
  const f = useFmt();
  const labels = domainLabels(useLang());
  if (events.length === 0) {
    return (
      <div className="clay" style={{ borderRadius: 20, padding: 24 }}>
        <p className="muted">{t.empty}</p>
      </div>
    );
  }
  const e = events[i];
  const inDays = daysUntil(e.startsOn);
  return (
    <div className="clay" style={{ borderRadius: 20, padding: "16px 16px 18px", display: "flex", flexDirection: "column", gap: 12 }} aria-roledescription={t.role} aria-label={t.label}>
      <div className="row-between" style={{ padding: "4px 6px 0" }}>
        <span className="lab" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="ball" style={{ width: 8, height: 8, background: "#68D1A4" }}></span>{t.label}
        </span>
        <span className="muted" style={{ font: "700 13px var(--sans)" }} aria-live="polite">
          {i + 1} / {events.length}
        </span>
      </div>
      <div className="sunk" style={{ height: 5, borderRadius: 10, margin: "0 6px" }}>
        <div style={{ width: `${((i + 1) / events.length) * 100}%`, height: "100%", borderRadius: 10, background: "#4D58EE" }}></div>
      </div>
      <div className="clay" style={{ borderRadius: 22, padding: 18, display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
        <div className="row-between">
          <span className="pill">{e.kind === "salon" ? t.trade : t.fair}</span>
          <span className="muted" style={{ font: "700 13px var(--sans)" }}>
            {inDays > 0 ? (
              <>
                {t.inDays.before} <b className="disp" style={{ fontSize: 20, color: "#1B2150" }}>{inDays}</b> {t.inDays.after(inDays)}
              </>
            ) : (
              all.ongoing
            )}
          </span>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div className="clay datebox">
            <div className="m">{f.monthUpper(e.startsOn)}</div>
            <div className="disp" style={{ fontSize: 30, padding: "10px 6px 2px" }}>{dayNumbers(e.startsOn, e.endsOn)}</div>
            <div className="muted" style={{ font: "700 11px var(--sans)", padding: "2px 6px 11px" }}>
              {f.weekday(e.startsOn)} → {f.weekday(e.endsOn)}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <h3 style={{ font: "800 21px/1.2 var(--sans)" }}>{e.name}</h3>
            <p className="muted" style={{ fontSize: 13.5 }}>
              {e.city} · {e.sector}
            </p>
            <p className="muted" style={{ fontSize: 13.5 }}>
              {all.days(eventDayCount(e.startsOn, e.endsOn))}{e.setupOn ? t.setup(f.dayLabel(e.setupOn)) : ""}
            </p>
          </div>
        </div>
        <EventArt logoUrl={e.logoUrl} name={e.name} height={122} />
        <div className="row-between">
          <div className="inline" style={{ gap: 6 }}>
            {e.specialty && <span className="tag">{labels.specialty(e.specialty)}</span>}
            <span className="tag">{all.available(e.available)}</span>
          </div>
          <Link className="clay s btn sm" href={`/reserver/nouveau?salon=${e.slug}`} prefetch={false}>
            {all.staff}
          </Link>
        </div>
      </div>
      <div className="sunk carousel-dots">
        {events.slice(0, 6).map((ev, n) => (
          <button key={ev.id} type="button" className={n === i ? "on" : ""} onClick={() => setI(n)} aria-label={`${ev.name}, ${f.shortDate(ev.startsOn)}`} aria-pressed={n === i}>
            <span className={`clay s sq${ev.kind === "foire" ? " ball" : ""}`} style={{ ["--c" as string]: ev.color }}></span>
            {f.shortDate(ev.startsOn)}
          </button>
        ))}
      </div>
    </div>
  );
}
