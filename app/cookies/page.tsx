import Link from "@/components/link";
import { Toc } from "@/components/doc-page";
import { pages } from "@/lib/i18n/messages/pages";
import { getMessages } from "@/lib/i18n/server";
import { CookieChoices } from "./choices";

export async function generateMetadata() {
  return { title: (await getMessages(pages)).cookies.title };
}

export default async function Page() {
  const all = await getMessages(pages);
  const t = all.cookies;
  return (
    <>
      <div className="head">
        <div>
          <span className="lab">{all.legal}</span>
          <h1>{t.title}</h1>
          <p>{t.lead}</p>
        </div>
      </div>
      <div className="doc">
        <Toc titles={t.toc} label={all.toc} />
        <div style={{ flex: "999 1 620px", minWidth: 0, display: "flex", flexDirection: "column", gap: 22 }}>
          <section className="clay prose">
            <h2 id="s1">1. {t.toc[0]}</h2>
            <CookieChoices />
          </section>
          <section className="clay prose">
            <h2 id="s2">2. {t.toc[1]}</h2>
            <p>{t.what}</p>
            <h2 id="s3">3. {t.toc[2]}</h2>
            <div className="tblwrap">
              <table className="tbl" style={{ fontSize: 14 }}>
                <thead>
                  <tr>
                    {t.cols.map((c) => (
                      <th key={c} scope="col">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {t.rows.map(([name, purpose, duration]) => (
                    <tr key={name}>
                      <td>{name}</td>
                      <td className="wrap">{purpose}</td>
                      <td>{duration}</td>
                    </tr>
                  ))}
                  <tr>
                    <td>
                      <span className="todo">{t.audienceTool}</span>
                    </td>
                    <td className="wrap">{t.audienceRow[0]}</td>
                    <td>{t.audienceRow[1]}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <h2 id="s4">4. {t.toc[3]}</h2>
            <p>
              {t.changeBefore}
              <Link href="/confidentialite">{t.privacy}</Link>.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
