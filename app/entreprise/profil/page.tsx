import { eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { ActionForm, Submit } from "@/components/action-form";
import { BackLink, PageHead, RCard } from "@/components/ui";
import { requireCompany } from "@/lib/auth/session";
import { COMPANY_SIZES, HUBSPOT_FIELDS, STANDARD_LEAD_COLUMNS } from "@/lib/domain";
import { company as messages } from "@/lib/i18n/messages/company";
import { domainLabels } from "@/lib/i18n/messages/domain";
import { getFmt, getMessages } from "@/lib/i18n/server";
import { formatSiret } from "@/lib/siret";
import { updateIdentity, updateLeadFormat, updateReferents, updateWeb } from "../actions";

export async function generateMetadata() {
  return { title: (await getMessages(messages)).profile.title };
}

export default async function Page() {
  const company = await requireCompany("/entreprise/profil");
  const db = await getDb();
  const referents = await db.select().from(s.companyReferents).where(eq(s.companyReferents.companyId, company.id));
  const [template] = await db.select().from(s.leadTemplates).where(eq(s.leadTemplates.companyId, company.id));
  const m = await getMessages(messages);
  const t = m.profile;
  const dl = domainLabels((await getFmt()).lang);
  return (
    <>
      <BackLink href="/entreprise">{m.area}</BackLink>
      <PageHead label={m.area} title={t.title}>
        {t.lead}
      </PageHead>
      <div className="grid2">
        <section className="clay panel">
          <h2>{t.company}</h2>
          <ActionForm action={updateIdentity} className="stack" style={{ gap: 14 }}>
            <label className="field">{t.name}<input className="input" name="name" defaultValue={company.name} required /></label>
            <label className="field">SIRET<input className="input" name="siret" defaultValue={formatSiret(company.siret)} required /></label>
            <label className="field">{t.sector}<input className="input" name="sector" defaultValue={company.sector ?? ""} /></label>
            <label className="field">
              {t.billingAddress}
              <input className="input" name="billingAddress" defaultValue={company.billingAddress ?? ""} autoComplete="street-address" required />
            </label>
            <label className="field">
              {t.vatNumber}
              <input className="input" name="vatNumber" defaultValue={company.vatNumber ?? ""} />
              <span className="hint">{t.vatHint}</span>
            </label>
            <label className="field">
              {t.size}
              <select className="input" name="size" defaultValue={company.size ?? ""}>
                <option value="">{m.choose}</option>
                {COMPANY_SIZES.map((sz) => (
                  <option key={sz} value={sz}>
                    {dl.size(sz)}
                  </option>
                ))}
              </select>
            </label>
            <Submit className="clay s btn sm">{m.save}</Submit>
          </ActionForm>
        </section>
        <section className="clay panel">
          <h2>{t.web}</h2>
          <ActionForm action={updateWeb} className="stack" style={{ gap: 14 }}>
            <label className="field">{t.website}<input className="input" name="website" defaultValue={company.website ?? ""} /></label>
            <label className="field">{t.linkedin}<input className="input" name="linkedin" defaultValue={company.linkedin ?? ""} /></label>
            <label className="field">
              {t.brochure(company.brochureName)}
              <input className="input" type="file" name="brochure" accept=".pdf,.ppt,.pptx" />
            </label>
            <Submit className="clay s btn sm">{m.save}</Submit>
          </ActionForm>
        </section>
        <section className="clay panel">
          <h2>{t.referents}</h2>
          <ActionForm action={updateReferents} className="stack" style={{ gap: 14 }}>
            {[0, 1, 2].map((i) => (
              <fieldset key={i} className="fgrid" style={{ border: 0, margin: 0, padding: 0 }}>
                <legend className="stitle" style={{ marginBottom: 6 }}>{t.referent(i + 1)}</legend>
                <label className="field">{t.refName}<input className="input" name="ref_name" defaultValue={referents[i]?.name} required={i === 0} /></label>
                <label className="field">{t.refTitle}<input className="input" name="ref_title" defaultValue={referents[i]?.title ?? ""} /></label>
                <label className="field">{t.refPhone}<input className="input" name="ref_phone" defaultValue={referents[i]?.phone ?? ""} /></label>
              </fieldset>
            ))}
            <Submit className="clay s btn sm">{m.save}</Submit>
          </ActionForm>
        </section>
        <section className="clay panel">
          <h2>{t.crm}</h2>
          <ActionForm action={updateLeadFormat} className="stack leadform" style={{ gap: 14 }}>
            <fieldset className="rcards" style={{ border: 0, margin: 0, padding: 0 }}>
              <legend className="sr-only">{t.format}</legend>
              <RCard name="mode" value="excel" checked={company.leadMode === "excel"} title={t.excel} />
              <RCard name="mode" value="crm" checked={company.leadMode === "crm"} title={t.hubspot} />
              <RCard name="mode" value="standard" checked={company.leadMode === "standard"} title={t.standard} />
            </fieldset>
            <div className="when when-excel stack">
              <label className="field">{t.template}<input className="input" type="file" name="template" accept=".xlsx" /></label>
              <label className="field">
                {t.columns}
                <textarea className="input" name="columns" defaultValue={template?.columns.join("\n")}></textarea>
              </label>
            </div>
            <div className="when when-crm stack">
              <label className="field">
                {t.crmAdmin}
                <input className="input" type="email" name="crmAdminEmail" defaultValue={company.crmAdminEmail ?? ""} />
              </label>
              <div className="chips" style={{ gap: 6 }}>
                {HUBSPOT_FIELDS.map((x) => (
                  <span key={x.label} className="colc">{x.label}</span>
                ))}
              </div>
            </div>
            <div className="when when-standard chips" style={{ gap: 6 }}>
              {STANDARD_LEAD_COLUMNS.map((c) => (
                <span key={c} className="colc">{dl.leadColumn(c)}</span>
              ))}
            </div>
            <Submit className="clay s btn sm">{m.save}</Submit>
          </ActionForm>
        </section>
      </div>
    </>
  );
}
