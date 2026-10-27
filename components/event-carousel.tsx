"use client";

import Link from "next/link";
import { useState } from "react";
import { dayNumbers, daysUntil, eventDayCount, monthUpper, shortDate, weekday } from "@/lib/format";
import type { EventCard } from "@/lib/queries";
import { EventArt } from "./event-art";

export function EventCarousel({ events }: { events: EventCard[] }) {
  const [i, setI] = useState(0);
  if (events.length === 0) {
    return (
      <div className="clay" style={{ borderRadius: 20, padding: 24 }}>
        <p className="muted">Aucun événement publié pour l’instant.</p>
      </div>
    );
  }
  const e = events[i];
  const inDays = daysUntil(e.startsOn);
  return (
    <div className="clay" style={{ borderRadius: 20, padding: "16px 16px 18px", display: "flex", flexDirection: "column", gap: 12 }} aria-roledescription="carrousel" aria-label="Prochains événements">
      <div className="row-between" style={{ padding: "4px 6px 0" }}>
        <span className="lab" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="ball" style={{ width: 8, height: 8, background: "#68D1A4" }}></span>Prochains événements
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
          <span className="pill">{e.kind === "salon" ? "Salon professionnel" : "Foire grand public"}</span>
          <span className="muted" style={{ font: "700 13px var(--sans)" }}>
            {inDays > 0 ? (
              <>
                dans <b className="disp" style={{ fontSize: 20, color: "#1B2150" }}>{inDays}</b> jour{inDays > 1 ? "s" : ""}
              </>
            ) : (
              "en cours"
            )}
          </span>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div className="clay datebox">
            <div className="m">{monthUpper(e.startsOn)}</div>
            <div className="disp" style={{ fontSize: 30, padding: "10px 6px 2px" }}>{dayNumbers(e.startsOn, e.endsOn)}</div>
            <div className="muted" style={{ font: "700 11px var(--sans)", padding: "2px 6px 11px" }}>
              {weekday(e.startsOn)} → {weekday(e.endsOn)}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <h3 style={{ font: "800 21px/1.2 var(--sans)" }}>{e.name}</h3>
            <p className="muted" style={{ fontSize: 13.5 }}>
              {e.city} · {e.sector}
            </p>
            <p className="muted" style={{ fontSize: 13.5 }}>
              {eventDayCount(e.startsOn, e.endsOn)} jours{e.setupOn ? ` · montage la veille, ${weekday(e.setupOn)} ${shortDate(e.setupOn)}` : ""}
            </p>
          </div>
        </div>
        <EventArt logoUrl={e.logoUrl} name={e.name} height={122} />
        <div className="row-between">
          <div className="inline" style={{ gap: 6 }}>
            {e.specialty && <span className="tag">{e.specialty}</span>}
            <span className="tag">{e.available} profils dispo</span>
          </div>
          <Link className="clay s btn sm" href={`/reserver/nouveau?salon=${e.slug}`} prefetch={false}>
            Staffer ce salon
          </Link>
        </div>
      </div>
      <div className="sunk carousel-dots">
        {events.slice(0, 6).map((ev, n) => (
          <button key={ev.id} type="button" className={n === i ? "on" : ""} onClick={() => setI(n)} aria-label={`${ev.name}, ${shortDate(ev.startsOn)}`} aria-pressed={n === i}>
            <span className={`clay s sq${ev.kind === "foire" ? " ball" : ""}`} style={{ ["--c" as string]: ev.color }}></span>
            {shortDate(ev.startsOn)}
          </button>
        ))}
      </div>
    </div>
  );
}
