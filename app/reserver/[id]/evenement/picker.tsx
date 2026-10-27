"use client";

import { useMemo, useState } from "react";
import { Submit } from "@/components/action-form";
import { dateRange, dayLabel, eventDayCount, listDays, shortDate, timeLabel, weekday } from "@/lib/format";
import type { EventCard } from "@/lib/queries";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function EventPicker({
  events,
  initial,
}: {
  events: EventCard[];
  initial: { eventId: string | null; days: string[]; startTime: string; endTime: string; stand: string };
}) {
  const start = events.find((e) => e.id === initial.eventId);
  const [kind, setKind] = useState<"salon" | "foire">(start?.kind ?? "salon");
  const [q, setQ] = useState("");
  const [eventId, setEventId] = useState<string | null>(initial.eventId);
  const [days, setDays] = useState<string[]>(initial.days);
  const [startTime, setStartTime] = useState(initial.startTime);
  const [endTime, setEndTime] = useState(initial.endTime);

  const list = useMemo(
    () => events.filter((e) => e.kind === kind && (!q || norm(`${e.name} ${e.city} ${e.sector} ${e.specialty ?? ""}`).includes(norm(q)))),
    [events, kind, q],
  );
  const ev = events.find((e) => e.id === eventId) ?? null;
  const allDays = ev ? [...(ev.setupOn ? [ev.setupOn] : []), ...listDays(ev.startsOn, ev.endsOn)] : [];

  const pick = (id: string) => {
    setEventId(id);
    const e = events.find((x) => x.id === id)!;
    setDays(listDays(e.startsOn, e.endsOn));
  };
  const minutes = (() => {
    const [a, b] = [startTime, endTime].map((t) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + (m || 0);
    });
    const amp = b - a;
    return amp > 360 ? amp - 60 : Math.max(amp, 0);
  })();

  return (
    <>
      <div className="row-between">
        <h2 className="ptitle">Quel événement ?</h2>
        <div className="seg sunk" style={{ flex: "none" }} role="tablist">
          {(["salon", "foire"] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={kind === k} className={kind === k ? "on" : ""} onClick={() => setKind(k)} style={{ border: 0, background: "none", flex: 1, padding: "12px 16px", borderRadius: 14, font: "700 14px/1.2 var(--sans)", color: kind === k ? "#1B2150" : "#575B7E", cursor: "pointer", ...(kind === k ? { background: "radial-gradient(140% 140% at 24% 14%,#fff 0%,#FCFBF9 50%,#e9e7ee 100%)", boxShadow: "inset 0 1px 0 #fff,0 6px 12px -6px rgba(52,58,112,.5)" } : {}) }}>
              {k === "salon" ? "Salons professionnels" : "Foires grand public"}
            </button>
          ))}
        </div>
      </div>
      <p className="muted small">
        {kind === "salon"
          ? "Visiteurs professionnels et rendez-vous qualifiés : commerciaux B2B, interprètes, accueil."
          : "Grand public et ventes sur place : démonstrateurs, animation, accueil."}
      </p>
      <label className="field">
        Rechercher
        <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, ville ou secteur : Tech Show, Cannes, santé…" />
      </label>

      <fieldset className="sunk" style={{ border: 0, margin: 0, borderRadius: 24, padding: 10, display: "flex", flexDirection: "column", gap: 8, maxHeight: 340, overflowY: "auto" }}>
        <legend className="sr-only">Événements</legend>
        {list.length === 0 && <p className="muted small" style={{ padding: 10 }}>Aucun événement ne correspond.</p>}
        {list.map((e) => {
          const on = e.id === eventId;
          return (
            <label
              key={e.id}
              className={on ? "clay s" : ""}
              style={{ borderRadius: 18, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", outline: on ? "3px solid #4D58EE" : undefined, outlineOffset: 1 }}
            >
              <input type="radio" name="eventId" value={e.id} checked={on} onChange={() => pick(e.id)} className="sr-only" />
              <span className="clay s" style={{ ["--c" as string]: e.color, width: 30, height: 30, borderRadius: 9, flex: "none" }}></span>
              <div style={{ flex: 1 }}>
                <b>{e.name}</b>
                <div className="muted small">
                  {e.city} · {dateRange(e.startsOn, e.endsOn, true)} · {e.sector}
                </div>
              </div>
              <span className="pill">{e.kind === "salon" ? "Salon pro" : "Foire"}</span>
            </label>
          );
        })}
      </fieldset>

      {ev && (
        <div className="clay" style={{ borderRadius: 22, padding: "16px 18px", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div className="sunk" style={{ width: 120, height: 72, borderRadius: 14, display: "grid", placeItems: "center", overflow: "hidden" }}>
            {ev.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ev.logoUrl} alt={`Logo ${ev.name}`} style={{ maxWidth: 100, maxHeight: 56, objectFit: "contain" }} />
            ) : (
              <span className="clay s" style={{ ["--c" as string]: ev.color, width: 44, height: 30, borderRadius: 8, display: "block" }}></span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <b>{ev.name}</b>
            <div className="muted small">
              {ev.city} · {eventDayCount(ev.startsOn, ev.endsOn)} jours
              {ev.setupOn ? ` · montage la veille, ${weekday(ev.setupOn)} ${shortDate(ev.setupOn)}` : ""}
              {ev.siteUrl && (
                <>
                  {" · "}
                  <a href={ev.siteUrl} target="_blank" rel="noopener noreferrer">
                    Site officiel
                  </a>
                </>
              )}
            </div>
            <div className="chips" style={{ marginTop: 8 }}>
              {ev.specialty && <span className="tag">{ev.specialty}</span>}
              <span className="tag">{ev.available} profils dispo</span>
            </div>
          </div>
        </div>
      )}

      {ev && (
        <>
          <h2 className="ptitle">Quels jours ?</h2>
          <div className="chips">
            {allDays.map((d) => (
              <label key={d} className="clay s chip">
                <input
                  type="checkbox"
                  name="days"
                  value={d}
                  checked={days.includes(d)}
                  onChange={(e) => setDays(e.target.checked ? [...days, d].sort() : days.filter((x) => x !== d))}
                />
                {dayLabel(d, true)}
                {d === ev.setupOn ? " · montage" : ""}
              </label>
            ))}
          </div>
          <div className="fgrid3">
            <label className="field">
              Début de service
              <input className="input" type="time" name="startTime" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            </label>
            <label className="field">
              Fin de service
              <input className="input" type="time" name="endTime" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
            </label>
            <label className="field">
              N° de stand
              <input className="input" name="stand" defaultValue={initial.stand} placeholder="B41" />
            </label>
          </div>
          <p className="muted small">
            {timeLabel(startTime)} – {timeLabel(endTime)} · {Math.floor(minutes / 60)} h{minutes % 60 ? ` ${minutes % 60}` : ""} facturées par jour
            {minutes > 300 ? " (pause déjeuner déduite)" : ""}.
          </p>
        </>
      )}
      <div className="nav-row">
        <span></span>
        <Submit disabled={!ev || days.length === 0}>Composer l’équipe</Submit>
      </div>
    </>
  );
}
