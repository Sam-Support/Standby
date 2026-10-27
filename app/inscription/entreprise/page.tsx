import Link from "next/link";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema as s } from "@/db";
import { ActionForm, Submit } from "@/components/action-form";
import { AccountFields, Progress, Why } from "@/components/onboarding";
import { PageHead, RCard } from "@/components/ui";
import { getCurrentCompany, getCurrentUser } from "@/lib/auth/session";
import { COMPANY_SIZES, HUBSPOT_FIELDS, STANDARD_LEAD_COLUMNS } from "@/lib/domain";
import { formatSiret } from "@/lib/siret";
import { companyStep } from "../actions";

export const metadata = { title: "Inscription entreprise" };

const LABELS = ["Société", "Web & plaquette", "Référents", "CRM & leads"];

export default async function Page({ searchParams }: { searchParams: Promise<{ etape?: string }> }) {
  const user = await getCurrentUser();
  if (user && user.role !== "exposant") redirect("/comptes?erreur=role");
  const company = await getCurrentCompany();
  if (company && company.onboardingStep > 4) redirect("/entreprise");
  const max = company?.onboardingStep ?? 1;
  const step = Math.min(Math.max(Number((await searchParams).etape) || max, 1), max);
  const db = await getDb();
  const referents = company ? await db.select().from(s.companyReferents).where(eq(s.companyReferents.companyId, company.id)) : [];
  const [template] = company ? await db.select().from(s.leadTemplates).where(eq(s.leadTemplates.companyId, company.id)) : [];

  return (
    <>
      <PageHead label="Inscription entreprise" title="Créer votre compte entreprise">
        Ces informations sont partagées avec les commerciaux que vous réservez, jamais publiées.
      </PageHead>
      <div className="layout">
        <section className="clay main">
          <Progress step={step} label={LABELS[step - 1]} next={LABELS.slice(step).join(" → ")} />
          <ActionForm action={companyStep.bind(null, step)} className="stack leadform" style={{ gap: 18 }}>
            {step === 1 && (
              <>
                {!user && <AccountFields />}
                <h2 className="ptitle">Votre société</h2>
                <div className="fgrid">
                  <label className="field">
                    Raison sociale <span className="req">*</span>
                    <input className="input" name="name" required defaultValue={company?.name} autoComplete="organization" />
                  </label>
                  <label className="field">
                    SIRET <span className="req">*</span>
                    <input className="input" name="siret" required inputMode="numeric" defaultValue={company ? formatSiret(company.siret) : ""} placeholder="834 521 907 00021" />
                    <span className="hint">Vérifié dans le répertoire SIRENE.</span>
                  </label>
                  <label className="field">
                    Secteur d’activité
                    <input className="input" name="sector" defaultValue={company?.sector ?? ""} placeholder="Industrie, retail, santé…" />
                  </label>
                  <label className="field">
                    Effectif
                    <select className="input" name="size" defaultValue={company?.size ?? ""}>
                      <option value="">Choisir</option>
                      {COMPANY_SIZES.map((sz) => (
                        <option key={sz}>{sz}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <p className="muted">Les commerciaux préparent leur pitch avec votre site, votre page LinkedIn et votre plaquette.</p>
                <div className="fgrid">
                  <label className="field">
                    Site web
                    <input className="input" name="website" type="url" defaultValue={company?.website ?? ""} placeholder="https://www.votre-site.fr" />
                  </label>
                  <label className="field">
                    Page LinkedIn
                    <input className="input" name="linkedin" type="url" defaultValue={company?.linkedin ?? ""} placeholder="https://www.linkedin.com/company/…" />
                  </label>
                </div>
                <div className="sunk drop">
                  <span className="clay s ic" aria-hidden="true"></span>
                  <div>
                    <label htmlFor="brochure">
                      <b>Plaquette commerciale</b>
                    </label>
                    <p className="muted small">PDF ou PowerPoint, 20 Mo maximum. Jointe à chaque mission proposée.{company?.brochureName ? ` Actuelle : ${company.brochureName}.` : ""}</p>
                  </div>
                  <input id="brochure" className="input" type="file" name="brochure" accept=".pdf,.ppt,.pptx" style={{ maxWidth: 280 }} />
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <p className="muted">La personne que les commerciaux appellent à leur arrivée et en cas d’imprévu. Vous la choisissez à chaque réservation.</p>
                {[0, 1, 2].map((i) => (
                  <fieldset key={i} className="fgrid" style={{ border: 0, padding: 0, margin: 0 }}>
                    <legend className="stitle" style={{ marginBottom: 8 }}>Référent {i + 1}{i === 0 ? " *" : " (facultatif)"}</legend>
                    <label className="field">
                      Nom et prénom
                      <input className="input" name="ref_name" required={i === 0} defaultValue={referents[i]?.name} />
                    </label>
                    <label className="field">
                      Fonction
                      <input className="input" name="ref_title" defaultValue={referents[i]?.title ?? ""} />
                    </label>
                    <label className="field">
                      Téléphone
                      <input className="input" name="ref_phone" type="tel" defaultValue={referents[i]?.phone ?? ""} />
                    </label>
                  </fieldset>
                ))}
              </>
            )}
            {step === 4 && (
              <>
                <p className="muted">Les commerciaux déposent leurs leads dans leur espace. Standby vérifie les colonnes et vous les remet dans votre format.</p>
                <fieldset className="rcards" style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend className="sr-only">Format de remontée des leads</legend>
                  <RCard name="mode" value="excel" checked={company?.leadMode !== "crm" && company?.leadMode !== "standard"} title="Je fournis mon template Excel">
                    Les fichiers des commerciaux sont contrôlés sur vos colonnes
                  </RCard>
                  <RCard name="mode" value="crm" checked={company?.leadMode === "crm"} title="Je donne un accès à mon CRM">
                    Import direct des leads, accès utilisateur limité
                  </RCard>
                  <RCard name="mode" value="standard" checked={company?.leadMode === "standard"} title="Pas de CRM">
                    Fiche standard Standby en Excel
                  </RCard>
                </fieldset>
                <div className="when when-excel stack">
                  <div className="sunk drop">
                    <span className="clay s ic" aria-hidden="true"></span>
                    <div>
                      <label htmlFor="template">
                        <b>Votre template Excel</b>
                      </label>
                      <p className="muted small">Nous lisons la première ligne (les en-têtes de colonnes).</p>
                    </div>
                    <input id="template" className="input" type="file" name="template" accept=".xlsx" style={{ maxWidth: 280 }} />
                  </div>
                  <label className="field">
                    Ou listez vos colonnes, une par ligne
                    <textarea className="input" name="columns" defaultValue={template?.columns.join("\n")} placeholder={"Nom\nPrénom\nSociété\nEmail"}></textarea>
                  </label>
                </div>
                <div className="when when-crm stack">
                  <div className="fgrid">
                    <label className="field">
                      Votre CRM <span className="req">*</span>
                      <select className="input" name="crmProvider" defaultValue="HubSpot">
                        <option>HubSpot</option>
                      </select>
                      <span className="hint">Salesforce et Pipedrive arrivent ensuite.</span>
                    </label>
                    <label className="field">
                      Email de l’administrateur CRM <span className="req">*</span>
                      <input className="input" name="crmAdminEmail" type="email" defaultValue={company?.crmAdminEmail ?? ""} />
                      <span className="hint">Nous lui envoyons une demande d’accès limité à la création de contacts.</span>
                    </label>
                  </div>
                  <span className="stitle">Champs importés</span>
                  <div className="chips" style={{ gap: 6 }}>
                    {HUBSPOT_FIELDS.map((f) => (
                      <span key={f.label} className="colc">{f.label}</span>
                    ))}
                  </div>
                </div>
                <div className="when when-standard stack">
                  <span className="stitle">Fiche standard Standby · {STANDARD_LEAD_COLUMNS.length} colonnes</span>
                  <div className="chips" style={{ gap: 6 }}>
                    {STANDARD_LEAD_COLUMNS.map((c) => (
                      <span key={c} className="colc">{c}</span>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div className="nav-row">
              {step > 1 ? (
                <Link className="clay btn ghost" href={`/inscription/entreprise?etape=${step - 1}`}>
                  Retour
                </Link>
              ) : (
                <span></span>
              )}
              <Submit>{step === 4 ? "Créer mon compte ✓" : "Continuer →"}</Submit>
            </div>
          </ActionForm>
        </section>
        <Why
          items={[
            ["Site et LinkedIn", "les commerciaux préparent leur pitch avant le briefing."],
            ["Plaquette", "jointe à chaque mission proposée."],
            ["Référents", "le contact sur place de l’équipe, choisi à chaque réservation."],
            ["CRM", "les fichiers de leads sont contrôlés sur vos colonnes avant de vous être remis."],
          ]}
        />
      </div>
    </>
  );
}
