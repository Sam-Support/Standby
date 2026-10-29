import Link from "@/components/link";
import { ActionForm, Submit } from "@/components/action-form";
import { SegOption } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/session";
import { pages } from "@/lib/i18n/messages/pages";
import { getMessages } from "@/lib/i18n/server";
import { sendContact } from "./actions";

export async function generateMetadata() {
  return { title: (await getMessages(pages)).contact.title };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  const user = await getCurrentUser();
  const all = await getMessages(pages);
  const t = all.contact;
  const lead = t.lead(t.faq);
  return (
    <>
      <div className="head">
        <div>
          <span className="lab">{all.help}</span>
          <h1>{t.title}</h1>
          <p>
            {lead.before}
            <Link href="/aide">{lead.faq}</Link>
            {lead.after}
          </p>
        </div>
      </div>
      <div className="layout">
        <section className="clay main">
          <h2 className="ptitle">{t.form}</h2>
          <ActionForm action={sendContact} className="stack" style={{ gap: 18 }}>
            <fieldset className="seg sunk" style={{ border: 0, margin: 0 }}>
              <legend className="sr-only">{t.youAre}</legend>
              <SegOption name="audience" value="entreprise" checked={user?.role !== "commercial"}>{t.audience.entreprise}</SegOption>
              <SegOption name="audience" value="commercial" checked={user?.role === "commercial"}>{t.audience.commercial}</SegOption>
              <SegOption name="audience" value="autre">{t.audience.autre}</SegOption>
            </fieldset>
            <div className="fgrid">
              <label className="field">
                {t.name} <span className="sr-only">{t.required}</span>
                <input className="input" name="name" required autoComplete="name" defaultValue={user ? `${user.firstName} ${user.lastName}` : ""} />
              </label>
              <label className="field">
                {t.email}
                <input className="input" name="email" type="email" required autoComplete="email" defaultValue={user?.email ?? ""} />
              </label>
              <label className="field">
                {t.subject}
                <select className="input" name="subject" defaultValue={ref ? t.subjects[0][0] : undefined}>
                  {t.subjects.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                {t.ref}
                <input className="input" name="ref" placeholder="SB-0000-0000" defaultValue={ref ?? ""} />
              </label>
            </div>
            <label className="field">
              {t.message}
              <textarea className="input" name="message" required minLength={10} placeholder={t.placeholder} style={{ minHeight: 150 }}></textarea>
            </label>
            <p className="muted small">
              {t.privacyBefore}
              <Link href="/confidentialite">{t.privacy}</Link>.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Submit>{t.submit}</Submit>
            </div>
          </ActionForm>
        </section>
        <aside className="clay aside">
          <h2 className="ptitle">{t.details}</h2>
          <dl>
            <div className="kv"><dt className="lab">{t.emailLabel}</dt><dd><span className="todo">[adresse e-mail]</span></dd></div>
            <div className="kv"><dt className="lab">{t.phone}</dt><dd><span className="todo">[numéro]</span></dd></div>
            <div className="kv"><dt className="lab">{t.address}</dt><dd><span className="todo">[adresse postale]</span></dd></div>
          </dl>
          <div className="sunk" style={{ borderRadius: 20, padding: "16px 18px" }}>
            <span className="lab">{t.hours}</span>
            <p style={{ marginTop: 6 }}>
              {t.weekdays}
              <span className="todo">[9 h – 18 h]</span>
            </p>
            <p className="muted small" style={{ marginTop: 8 }}>
              {t.emergency}
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
