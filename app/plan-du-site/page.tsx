import Link from "@/components/link";
import { pages } from "@/lib/i18n/messages/pages";
import { getMessages } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: (await getMessages(pages)).sitemap.title };
}

export default async function Page() {
  const all = await getMessages(pages);
  const t = all.sitemap;
  return (
    <>
      <div className="head">
        <div>
          <span className="lab">{all.help}</span>
          <h1>{t.title}</h1>
          <p>{t.lead}</p>
        </div>
      </div>
      <div className="grid3" style={{ gap: 22, alignItems: "start" }}>
        {t.sections.map(([title, links]) => (
          <section key={title} className="clay panel">
            <h2>{title}</h2>
            <ul style={{ padding: 0, margin: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href}>{label}</Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
