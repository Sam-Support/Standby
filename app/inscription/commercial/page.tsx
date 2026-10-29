import Link from "@/components/link";
import { getFmt, getLang, getMessages } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema as s } from "@/db";
import { ActionForm, Submit } from "@/components/action-form";
import { BillingFields } from "@/components/billing-fields";
import { AccountFields, Progress, Why } from "@/components/onboarding";
import { OrderedChips } from "@/components/ordered-chips";
import { Chip, PageHead, Status } from "@/components/ui";
import { getCurrentFreelancer, getCurrentUser } from "@/lib/auth/session";
import { LANGUAGES, SIGNUP_ROLE_ORDER, SPECIALTIES, type DocumentKey } from "@/lib/domain";
import { domainLabels } from "@/lib/i18n/messages/domain";
import { signup } from "@/lib/i18n/messages/signup";
import { getPricing } from "@/lib/settings";
import { formatSiret } from "@/lib/siret";
import { freelancerStep } from "../actions";

export async function generateMetadata() {
  return { title: (await getMessages(signup)).freelancer.title };
}

const TOPS = ["XS", "S", "M", "L", "XL", "XXL"];

export default async function Page({ searchParams }: { searchParams: Promise<{ etape?: string }> }) {
  const user = await getCurrentUser();
  if (user && user.role !== "commercial") redirect(localizePath("/comptes?erreur=role", await getLang()));
  const f = await getCurrentFreelancer();
  if (f && f.onboardingStep > 4) redirect(localizePath("/commercial", await getLang()));
  const max = f?.onboardingStep ?? 1;
  const step = Math.min(Math.max(Number((await searchParams).etape) || max, 1), max);
  const db = await getDb();
  const pricing = await getPricing(db);
  const docs = f ? await db.select().from(s.freelancerDocuments).where(eq(s.freelancerDocuments.freelancerId, f.id)) : [];
  const otherLangs = f?.languages.filter((l) => !LANGUAGES.includes(l)) ?? [];
  const otherSpecs = f?.specialties.filter((x) => !SPECIALTIES.includes(x)) ?? [];
  const m = await getMessages(signup);
  const t = m.freelancer;
  const fm = await getFmt();
  const dl = domainLabels(fm.lang);
  const labels = t.steps;

  return (
    <>
      <PageHead label={t.title} title={t.h1}>
        {t.lead}
      </PageHead>
      <div className="layout">
        <section className="clay main">
          <Progress step={step} label={labels[step - 1]} next={labels.slice(step).join(" → ")} color="#68D1A4" />
          <ActionForm action={freelancerStep.bind(null, step)} className="stack" style={{ gap: 18 }}>
            {step === 1 && (
              <>
                {!user ? (
                  <AccountFields />
                ) : (
                  <div className="fgrid">
                    <label className="field">
                      {t.firstName}
                      <input className="input" name="firstName" defaultValue={user.firstName} required />
                    </label>
                    <label className="field">
                      {t.lastName}
                      <input className="input" name="lastName" defaultValue={user.lastName} required />
                    </label>
                    <label className="field">
                      {t.phone}
                      <input className="input" name="phone" type="tel" defaultValue={user.phone ?? ""} />
                    </label>
                  </div>
                )}
                <h2 className="ptitle">{t.where}</h2>
                <div className="fgrid">
                  <label className="field">
                    <span>{t.city} <span className="req">*</span></span>
                    <input className="input" name="city" required defaultValue={f?.city} autoComplete="address-level2" placeholder={t.cityPlaceholder} />
                  </label>
                </div>
                <label className="field">
                  {t.bio}
                  <textarea className="input" name="bio" defaultValue={f?.bio ?? ""} placeholder={t.bioPlaceholder}></textarea>
                </label>
              </>
            )}
            {step === 2 && (
              <>
                <h2 className="ptitle">{t.roles} <span className="req">*</span></h2>
                <p className="muted small">{t.rolesHint}</p>
                <OrderedChips name="roles" options={SIGNUP_ROLE_ORDER.map((r) => ({ value: r, label: dl.role(r).label }))} initial={f?.roles ?? []} />
                <h2 className="ptitle">{t.specialties} <span className="req">*</span></h2>
                <p className="muted small">{t.specialtiesHint}</p>
                <div className="chips">
                  {SPECIALTIES.map((sp) => (
                    <Chip key={sp} name="specialties" value={sp} checked={f?.specialties.includes(sp)}>{dl.specialty(sp)}</Chip>
                  ))}
                  <input className="input" name="otherSpecialty" aria-label={t.otherSpecialty} placeholder={m.other} defaultValue={otherSpecs[0] ?? ""} style={{ width: 180, minHeight: 40, padding: "8px 12px" }} />
                </div>
                <h2 className="ptitle">{t.languages} <span className="req">*</span></h2>
                <div className="chips">
                  {LANGUAGES.map((l) => (
                    <Chip key={l} name="languages" value={l} checked={f?.languages.length ? f.languages.includes(l) : l === "Français"}>{dl.language(l)}</Chip>
                  ))}
                  <input className="input" name="otherLanguage" aria-label={t.otherLanguage} placeholder={m.other} defaultValue={otherLangs[0] ?? ""} style={{ width: 160, minHeight: 40, padding: "8px 12px" }} />
                </div>
                <div className="fgrid">
                  <label className="field">
                    <span>{t.rate} <span className="req">*</span></span>
                    <input className="input" name="rate" inputMode="decimal" required defaultValue={f?.hourlyRateCents ? f.hourlyRateCents / 100 : ""} placeholder="30" />
                    <span className="hint">{t.rateHint(SIGNUP_ROLE_ORDER.map((r) => `${dl.role(r).short} ${fm.hourly(pricing.floors[r])}`).join(" · "))}</span>
                  </label>
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <p className="muted">{t.outfitLead}</p>
                <div className="fgrid3">
                  <label className="field">
                    {t.top}
                    <select className="input" name="top" defaultValue={f?.topSize ?? "M"}>
                      {TOPS.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    {t.pants}
                    <select className="input" name="pants" defaultValue={f?.pantsSize ?? "40"}>
                      {Array.from({ length: 9 }, (_, i) => String(34 + i * 2)).map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    {t.shoe}
                    <select className="input" name="shoe" defaultValue={f?.shoeSize ?? "40"}>
                      {Array.from({ length: 13 }, (_, i) => String(35 + i)).map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </>
            )}
            {step === 4 && (
              <>
                <div className="fgrid">
                  <label className="field">
                    <span>SIRET <span className="req">*</span></span>
                    <input className="input" name="siret" inputMode="numeric" required defaultValue={f?.siret ? formatSiret(f.siret) : ""} />
                  </label>
                  <label className="field">
                    {t.status}
                    <select className="input" name="legalStatus" defaultValue={f?.legalStatus ?? "Auto-entrepreneur"}>
                      {t.statuses.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <h2 className="ptitle">{t.documents}</h2>
                <p className="muted small">{t.documentsHint}</p>
                {(["identite", "urssaf", "rib", "siret"] as DocumentKey[]).map((k) => {
                  const d = docs.find((x) => x.type === k);
                  return (
                    <div key={k} className="sunk drop">
                      <span className="clay s ic" style={{ ["--c" as string]: "#68D1A4" }} aria-hidden="true"></span>
                      <div>
                        <label htmlFor={`doc_${k}`}>
                          <b>{dl.document(k)}</b> {k !== "siret" && <span className="req">*</span>}
                        </label>
                        <p className="muted small">
                          {d ? (
                            <>
                              {d.filename} ·{" "}
                              <Status tone={d.status === "valide" ? "ok" : d.status === "refuse" ? "warn" : "info"}>
                                {d.status === "valide" ? t.docValid : d.status === "refuse" ? t.docFix(d.comment) : t.docReceived}
                              </Status>
                            </>
                          ) : k === "siret" ? (
                            t.siretOptional
                          ) : (
                            t.toUpload
                          )}
                        </p>
                      </div>
                      <input id={`doc_${k}`} className="input" type="file" name={`doc_${k}`} accept=".pdf,.jpg,.jpeg,.png" style={{ maxWidth: 280 }} />
                      {k === "urssaf" && (
                        <label className="field" style={{ flexBasis: "100%" }}>
                          {t.urssafDate}
                          <input className="input" type="date" name="urssafIssuedOn" defaultValue={d?.issuedOn ?? ""} style={{ maxWidth: 220 }} />
                        </label>
                      )}
                    </div>
                  );
                })}
                <h2 className="ptitle">{t.billing}</h2>
                <p className="muted small">{t.billingLead}</p>
                <BillingFields f={f} />
              </>
            )}
            <div className="nav-row">
              {step > 1 ? (
                <Link className="clay btn ghost" href={`/inscription/commercial?etape=${step - 1}`}>
                  {m.back}
                </Link>
              ) : (
                <span></span>
              )}
              <Submit className="clay btn butter">{step === 4 ? t.submit : m.next}</Submit>
            </div>
          </ActionForm>
        </section>
        <Why color="#1C8755" items={t.why} />
      </div>
    </>
  );
}
