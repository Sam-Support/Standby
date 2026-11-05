"use client";

import { useMemo, useState } from "react";
import { Submit } from "@/components/action-form";
import { EventArt } from "@/components/event-art";
import { useFmt, useMessages } from "@/components/i18n";
import { eventDayCount, listDays } from "@/lib/format";
import { booking } from "@/lib/i18n/messages/booking";
import { domainLabels } from "@/lib/i18n/messages/domain";
import type { EventCard } from "@/lib/queries";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function EventPicker({
  events,
  initial,
}: {
  events: EventCard[];
  initial: { eventId: string | null; days: string[]; startTime: string; endTime: string; stand: string };
}) {
  const m = useMessages(booking);
  const t = m.picker;
  const f = useFmt();
  const dl = domainLabels(f.lang);
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
        <h2 className="ptitle">{t.which}</h2>
        <div className="seg sunk" style={{ flex: "0 1 auto", maxWidth: "100%" }} role="tablist">
          {(["salon", "foire"] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={kind === k} className={kind === k ? "on" : ""} onClick={() => setKind(k)} style={{ border: 0, background: "none", flex: 1, padding: "12px 16px", borderRadius: 14, font: "700 14px/1.2 var(--sans)", color: kind === k ? "#1B2150" : "#575B7E", cursor: "pointer", ...(kind === k ? { background: "radial-gradient(140% 140% at 24% 14%,#fff 0%,#FCFBF9 50%,#e9e7ee 100%)", boxShadow: "inset 0 1px 0 #fff,0 6px 12px -6px rgba(52,58,112,.5)" } : {}) }}>
              {k === "salon" ? t.salons : t.fairs}
            </button>
          ))}
        </div>
      </div>
      <p className="muted small">
        {kind === "salon" ? t.salonHint : t.fairHint}
      </p>
      <label className="field">
        {t.search}
        <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchPlaceholder} />
      </label>

      <fieldset className="sunk" style={{ border: 0, margin: 0, borderRadius: 24, padding: 10, display: "flex", flexDirection: "column", gap: 8, maxHeight: 340, overflowY: "auto" }}>
        <legend className="sr-only">{t.events}</legend>
        {list.length === 0 && <p className="muted small" style={{ padding: 10 }}>{t.none}</p>}
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
                  {e.city} · {f.dateRange(e.startsOn, e.endsOn, true)} · {dl.specialty(e.sector)}
                </div>
              </div>
              <span className="pill">{e.kind === "salon" ? m.kind.salon : m.kind.foire}</span>
            </label>
          );
        })}
      </fieldset>

      {ev && (
        <div className="clay" style={{ borderRadius: 22, padding: "16px 18px", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ width: 120, flex: "none" }}>
            <EventArt logoUrl={ev.logoUrl} name={ev.name} color={ev.color} height={72} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <b>{ev.name}</b>
            <div className="muted small">
              {ev.city} · {t.dayCount(eventDayCount(ev.startsOn, ev.endsOn))}
              {ev.setupOn ? t.setup(`${f.weekday(ev.setupOn)} ${f.shortDate(ev.setupOn)}`) : ""}
              {ev.siteUrl && (
                <>
                  {" · "}
                  <a href={ev.siteUrl} target="_blank" rel="noopener noreferrer">
                    {t.site}
                  </a>
                </>
              )}
            </div>
            <div className="chips" style={{ marginTop: 8 }}>
              {ev.specialty && <span className="tag">{dl.specialty(ev.specialty)}</span>}
              <span className="tag">{t.available(ev.available)}</span>
            </div>
          </div>
        </div>
      )}

      {ev && (
        <>
          <h2 className="ptitle">{t.whichDays}</h2>
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
                {f.dayLabel(d, true)}
                {d === ev.setupOn ? t.setupDay : ""}
              </label>
            ))}
          </div>
          <div className="fgrid3">
            <label className="field">
              {t.start}
              <input className="input" type="time" name="startTime" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            </label>
            <label className="field">
              {t.end}
              <input className="input" type="time" name="endTime" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
            </label>
            <label className="field">
              {t.stand}
              <input className="input" name="stand" defaultValue={initial.stand} placeholder="B41" />
            </label>
          </div>
          <p className="muted small">
            {t.billed(`${f.timeLabel(startTime)} – ${f.timeLabel(endTime)}`, f.hoursLabel(minutes), minutes > 300)}
          </p>
        </>
      )}
      <div className="nav-row">
        <span></span>
        <Submit disabled={!ev || days.length === 0}>{t.next}</Submit>
      </div>
    </>
  );
}
