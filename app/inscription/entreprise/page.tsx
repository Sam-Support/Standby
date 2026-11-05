import Link from "@/components/link";
import { getFmt, getLang, getMessages } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema as s } from "@/db";
import { ActionForm, Submit } from "@/components/action-form";
import { AccountFields, Progress, Why } from "@/components/onboarding";
import { PageHead, RCard } from "@/components/ui";
import { getCurrentCompany, getCurrentUser } from "@/lib/auth/session";
import { COMPANY_SIZES, HUBSPOT_FIELDS, STANDARD_LEAD_COLUMNS } from "@/lib/domain";
import { domainLabels } from "@/lib/i18n/messages/domain";
import { signup } from "@/lib/i18n/messages/signup";
import { formatSiret } from "@/lib/siret";
import { companyStep } from "../actions";

export async function generateMetadata() {
  return { title: (await getMessages(signup)).company.title };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ etape?: string }> }) {
  const user = await getCurrentUser();
  if (user && user.role !== "exposant") redirect(localizePath("/comptes?erreur=role", await getLang()));
  const company = await getCurrentCompany();
  if (company && company.onboardingStep > 4) redirect(localizePath("/entreprise", await getLang()));
  const max = company?.onboardingStep ?? 1;
  const step = Math.min(Math.max(Number((await searchParams).etape) || max, 1), max);
  const db = await getDb();
  const referents = company ? await db.select().from(s.companyReferents).where(eq(s.companyReferents.companyId, company.id)) : [];
  const [template] = company ? await db.select().from(s.leadTemplates).where(eq(s.leadTemplates.companyId, company.id)) : [];
  const m = await getMessages(signup);
  const t = m.company;
  const dl = domainLabels((await getFmt()).lang);
  const labels = t.steps;

  return (
    <>
      <PageHead label={t.title} title={t.h1}>
        {t.lead}
      </PageHead>
      <div className="layout">
        <section className="clay main">
          <Progress step={step} label={labels[step - 1]} next={labels.slice(step).join(" → ")} />
          <ActionForm action={companyStep.bind(null, step)} className="stack leadform" style={{ gap: 18 }}>
            {step === 1 && (
              <>
                {!user && <AccountFields />}
                <h2 className="ptitle">{t.yourCompany}</h2>
                <div className="fgrid">
                  <label className="field">
                    <span>{t.name} <span className="req">*</span></span>
                    <input className="input" name="name" required defaultValue={company?.name} autoComplete="organization" />
                  </label>
                  <label className="field">
                    <span>SIRET <span className="req">*</span></span>
                    <input className="input" name="siret" required inputMode="numeric" defaultValue={company ? formatSiret(company.siret) : ""} placeholder="834 521 907 00024" />
                    <span className="hint">{t.siretHint}</span>
                  </label>
                  <label className="field">
                    {t.sector}
                    <input className="input" name="sector" defaultValue={company?.sector ?? ""} placeholder={t.sectorPlaceholder} />
                  </label>
                  <label className="field">
                    {t.size}
                    <select className="input" name="size" defaultValue={company?.size ?? ""}>
                      <option value="">{m.choose}</option>
                      {COMPANY_SIZES.map((sz) => (
                        <option key={sz} value={sz}>
                          {dl.size(sz)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field" style={{ gridColumn: "1 / -1" }}>
                    <span>
                      {t.billingAddress} <span className="req">*</span>
                    </span>
                    <input className="input" name="billingAddress" required defaultValue={company?.billingAddress ?? ""} autoComplete="street-address" placeholder="12 rue de la Paix, 75002 Paris" />
                  </label>
                  <label className="field">
                    {t.vatNumber}
                    <input className="input" name="vatNumber" defaultValue={company?.vatNumber ?? ""} placeholder="FR12 834521907" />
                    <span className="hint">{t.vatHint}</span>
                  </label>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <p className="muted">{t.webLead}</p>
                <div className="fgrid">
                  <label className="field">
                    {t.website}
                    <input className="input" name="website" type="text" inputMode="url" autoComplete="url" defaultValue={company?.website ?? ""} placeholder={t.websitePlaceholder} />
                  </label>
                  <label className="field">
                    {t.linkedin}
                    <input className="input" name="linkedin" type="text" inputMode="url" defaultValue={company?.linkedin ?? ""} placeholder="https://www.linkedin.com/company/…" />
                  </label>
                </div>
                <div className="sunk drop">
                  <span className="clay s ic" aria-hidden="true"></span>
                  <div>
                    <label htmlFor="brochure">
                      <b>{t.brochure}</b>
                    </label>
                    <p className="muted small">{t.brochureHint(company?.brochureName ?? null)}</p>
                  </div>
                  <input id="brochure" className="input" type="file" name="brochure" accept=".pdf,.ppt,.pptx" style={{ maxWidth: 280 }} />
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <p className="muted">{t.referentsLead}</p>
                {[0, 1, 2].map((i) => (
                  <fieldset key={i} className="fgrid" style={{ border: 0, padding: 0, margin: 0 }}>
                    <legend className="stitle" style={{ marginBottom: 8 }}>
                      {t.referent(i + 1, i === 0)}
                    </legend>
                    <label className="field">
                      {t.fullName}
                      <input className="input" name="ref_name" required={i === 0} defaultValue={referents[i]?.name} />
                    </label>
                    <label className="field">
                      {t.jobTitle}
                      <input className="input" name="ref_title" defaultValue={referents[i]?.title ?? ""} />
                    </label>
                    <label className="field">
                      {t.phone}
                      <input className="input" name="ref_phone" type="tel" defaultValue={referents[i]?.phone ?? ""} />
                    </label>
                  </fieldset>
                ))}
              </>
            )}
            {step === 4 && (
              <>
                <p className="muted">{t.leadsLead}</p>
                <fieldset className="rcards" style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend className="sr-only">{t.leadFormat}</legend>
                  <RCard name="mode" value="excel" checked={company?.leadMode !== "crm" && company?.leadMode !== "standard"} title={t.modes.excel[0]}>
                    {t.modes.excel[1]}
                  </RCard>
                  <RCard name="mode" value="crm" checked={company?.leadMode === "crm"} title={t.modes.crm[0]}>
                    {t.modes.crm[1]}
                  </RCard>
                  <RCard name="mode" value="standard" checked={company?.leadMode === "standard"} title={t.modes.standard[0]}>
                    {t.modes.standard[1]}
                  </RCard>
                </fieldset>
                <div className="when when-excel stack">
                  <div className="sunk drop">
                    <span className="clay s ic" aria-hidden="true"></span>
                    <div>
                      <label htmlFor="template">
                        <b>{t.template}</b>
                      </label>
                      <p className="muted small">{t.templateHint}</p>
                    </div>
                    <input id="template" className="input" type="file" name="template" accept=".xlsx" style={{ maxWidth: 280 }} />
                  </div>
                  <label className="field">
                    {t.columns}
                    <textarea className="input" name="columns" defaultValue={template?.columns.join("\n")} placeholder={t.columnsPlaceholder}></textarea>
                  </label>
                </div>
                <div className="when when-crm stack">
                  <div className="fgrid">
                    <label className="field">
                      <span>{t.crm} <span className="req">*</span></span>
                      <select className="input" name="crmProvider" defaultValue="HubSpot">
                        <option>HubSpot</option>
                      </select>
                      <span className="hint">{t.crmHint}</span>
                    </label>
                    <label className="field">
                      <span>{t.crmAdmin} <span className="req">*</span></span>
                      <input className="input" name="crmAdminEmail" type="email" defaultValue={company?.crmAdminEmail ?? ""} />
                      <span className="hint">{t.crmAdminHint}</span>
                    </label>
                  </div>
                  <span className="stitle">{t.imported}</span>
                  <div className="chips" style={{ gap: 6 }}>
                    {HUBSPOT_FIELDS.map((f) => (
                      <span key={f.label} className="colc">{f.label}</span>
                    ))}
                  </div>
                </div>
                <div className="when when-standard stack">
                  <span className="stitle">{t.standardSheet(STANDARD_LEAD_COLUMNS.length)}</span>
                  <div className="chips" style={{ gap: 6 }}>
                    {STANDARD_LEAD_COLUMNS.map((c) => (
                      <span key={c} className="colc">{dl.leadColumn(c)}</span>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div className="nav-row">
              {step > 1 ? (
                <Link className="clay btn ghost" href={`/inscription/entreprise?etape=${step - 1}`}>
                  {m.back}
                </Link>
              ) : (
                <span></span>
              )}
              <Submit>{step === 4 ? t.submit : m.next}</Submit>
            </div>
          </ActionForm>
        </section>
        <Why items={t.why} />
      </div>
    </>
  );
}
