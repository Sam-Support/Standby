import Link from "next/link";
import { Fragment } from "react";

/**
 * Mise en forme légère pour les textes légaux :
 * [à compléter] → surligné, **gras**, {lien|/chemin} → lien interne.
 */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]|\*\*[^*]+\*\*|\{[^}|]+\|[^}]+\})/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("[") && p.endsWith("]")) return <span key={i} className="todo">{p}</span>;
        if (p.startsWith("**")) return <b key={i}>{p.slice(2, -2)}</b>;
        if (p.startsWith("{")) {
          const [label, href] = p.slice(1, -1).split("|");
          return (
            <Link key={i} href={href}>
              {label}
            </Link>
          );
        }
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}

export type DocSection = { title: string; body: (string | string[])[] };

export function DocBody({ sections }: { sections: DocSection[] }) {
  return (
    <>
      {sections.map((sec, i) => (
        <Fragment key={sec.title}>
          <h2 id={`s${i + 1}`}>
            {i + 1}. {sec.title}
          </h2>
          {sec.body.map((b, j) =>
            Array.isArray(b) ? (
              <ul key={j}>
                {b.map((li) => (
                  <li key={li}>
                    <Rich text={li} />
                  </li>
                ))}
              </ul>
            ) : (
              <p key={j}>
                <Rich text={b} />
              </p>
            ),
          )}
        </Fragment>
      ))}
    </>
  );
}

export function Toc({ titles, label = "Sommaire" }: { titles: string[]; label?: string }) {
  return (
    <nav className="clay toc" aria-label={label}>
      <span className="lab">{label}</span>
      {titles.map((t, i) => (
        <a key={t} href={`#s${i + 1}`}>
          <b>{i + 1}</b>
          {t}
        </a>
      ))}
    </nav>
  );
}

export function DocPage({ label = "Informations légales", title, intro, sections }: { label?: string; title: string; intro: string; sections: DocSection[] }) {
  return (
    <>
      <div className="head">
        <div>
          <span className="lab">{label}</span>
          <h1>{title}</h1>
          <p>
            <Rich text={intro} />
          </p>
        </div>
      </div>
      <div className="doc">
        <Toc titles={sections.map((s) => s.title)} />
        <article className="clay prose">
          <DocBody sections={sections} />
        </article>
      </div>
    </>
  );
}
