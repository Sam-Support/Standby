"use client";

import { useState } from "react";
import { Rich } from "@/components/doc-page";
import { useMessages } from "@/components/i18n";
import { pages } from "@/lib/i18n/messages/pages";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function FaqSearch({ faq }: { faq: { theme: string; items: [string, string][] }[] }) {
  const t = useMessages(pages).faq;
  const [q, setQ] = useState("");
  const filtered = faq
    .map((t) => ({ ...t, items: t.items.filter(([qq, a]) => !q || norm(qq + a).includes(norm(q))) }))
    .filter((t) => t.items.length > 0);
  return (
    <>
      <label className="sr-only" htmlFor="faq-q">
        {t.search}
      </label>
      <input id="faq-q" className="input" type="search" placeholder={t.placeholder} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="doc">
        <nav className="clay toc" aria-label={t.themes}>
          <span className="lab">{t.themes}</span>
          {faq.map((t, i) => (
            <a key={t.theme} href={`#t${i}`}>
              <b>{i + 1}</b>
              {t.theme}
            </a>
          ))}
        </nav>
        <div style={{ flex: "999 1 620px", minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          {filtered.map((t) => (
            <section key={t.theme} id={`t${faq.findIndex((x) => x.theme === t.theme)}`} style={{ display: "flex", flexDirection: "column", gap: 14, scrollMarginTop: 110 }}>
              <h2 className="disp" style={{ fontSize: 24, marginTop: 10 }}>
                {t.theme}
              </h2>
              {t.items.map(([question, answer]) => (
                <div key={question} className="clay qa">
                  <b>{question}</b>
                  <p className="muted">
                    <Rich text={answer} />
                  </p>
                </div>
              ))}
            </section>
          ))}
          {filtered.length === 0 && <p className="muted">{t.none(q)}</p>}
        </div>
      </div>
    </>
  );
}
