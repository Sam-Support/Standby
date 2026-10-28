import Link from "next/link";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema as s } from "@/db";
import { ActionForm, Submit } from "@/components/action-form";
import { BillingFields } from "@/components/billing-fields";
import { AccountFields, Progress, Why } from "@/components/onboarding";
import { OrderedChips } from "@/components/ordered-chips";
import { Chip, PageHead, Status } from "@/components/ui";
import { getCurrentFreelancer, getCurrentUser } from "@/lib/auth/session";
import { DOCUMENT_TYPES, LANGUAGES, ROLES, SIGNUP_ROLE_ORDER, SPECIALTIES, type DocumentKey } from "@/lib/domain";
import { hourly } from "@/lib/format";
import { getPricing } from "@/lib/settings";
import { formatSiret } from "@/lib/siret";
import { freelancerStep } from "../actions";

export const metadata = { title: "Inscription commercial·e" };

const LABELS = ["Identité", "Profil", "Tenue", "Statut & documents"];
const TOPS = ["XS", "S", "M", "L", "XL", "XXL"];

export default async function Page({ searchParams }: { searchParams: Promise<{ etape?: string }> }) {
  const user = await getCurrentUser();
  if (user && user.role !== "commercial") redirect("/comptes?erreur=role");
  const f = await getCurrentFreelancer();
  if (f && f.onboardingStep > 4) redirect("/commercial");
  const max = f?.onboardingStep ?? 1;
  const step = Math.min(Math.max(Number((await searchParams).etape) || max, 1), max);
  const db = await getDb();
  const pricing = await getPricing(db);
  const docs = f ? await db.select().from(s.freelancerDocuments).where(eq(s.freelancerDocuments.freelancerId, f.id)) : [];
  const otherLangs = f?.languages.filter((l) => !LANGUAGES.includes(l)) ?? [];
  const otherSpecs = f?.specialties.filter((x) => !SPECIALTIES.includes(x)) ?? [];

  return (
    <>
      <PageHead label="Inscription commercial·e" title="Créer votre compte commercial">
        Quatre étapes, environ trois minutes. Votre profil est visible des exposants dès la validation de vos documents.
      </PageHead>
      <div className="layout">
        <section className="clay main">
          <Progress step={step} label={LABELS[step - 1]} next={LABELS.slice(step).join(" → ")} color="#68D1A4" />
          <ActionForm action={freelancerStep.bind(null, step)} className="stack" style={{ gap: 18 }}>
            {step === 1 && (
              <>
                {!user ? (
                  <AccountFields />
                ) : (
                  <div className="fgrid">
                    <label className="field">
                      Prénom
                      <input className="input" name="firstName" defaultValue={user.firstName} required />
                    </label>
                    <label className="field">
                      Nom
                      <input className="input" name="lastName" defaultValue={user.lastName} required />
                    </label>
                    <label className="field">
                      Téléphone
                      <input className="input" name="phone" type="tel" defaultValue={user.phone ?? ""} />
                    </label>
                  </div>
                )}
                <h2 className="ptitle">Où travaillez-vous ?</h2>
                <div className="fgrid">
                  <label className="field">
                    Ville <span className="req">*</span>
                    <input className="input" name="city" required defaultValue={f?.city} autoComplete="address-level2" placeholder="Paris, Lyon, Cannes…" />
                  </label>
                </div>
                <label className="field">
                  Présentation (facultatif)
                  <textarea className="input" name="bio" defaultValue={f?.bio ?? ""} placeholder="Votre expérience des salons, vos points forts…"></textarea>
                </label>
              </>
            )}
            {step === 2 && (
              <>
                <h2 className="ptitle">Postes <span className="req">*</span></h2>
                <p className="muted small">Le premier choisi devient votre poste principal.</p>
                <OrderedChips name="roles" options={SIGNUP_ROLE_ORDER.map((r) => ({ value: r, label: ROLES[r].label }))} initial={f?.roles ?? []} />
                <h2 className="ptitle">Spécialités <span className="req">*</span></h2>
                <p className="muted small">Les secteurs que vous connaissez : ils comptent dans le matching avec les événements.</p>
                <div className="chips">
                  {SPECIALTIES.map((sp) => (
                    <Chip key={sp} name="specialties" value={sp} checked={f?.specialties.includes(sp)}>{sp}</Chip>
                  ))}
                  <input className="input" name="otherSpecialty" aria-label="Autre spécialité" placeholder="+ Autre" defaultValue={otherSpecs[0] ?? ""} style={{ width: 180, minHeight: 40, padding: "8px 12px" }} />
                </div>
                <h2 className="ptitle">Langues parlées <span className="req">*</span></h2>
                <div className="chips">
                  {LANGUAGES.map((l) => (
                    <Chip key={l} name="languages" value={l} checked={f ? f.languages.includes(l) : l === "Français"}>{l}</Chip>
                  ))}
                  <input className="input" name="otherLanguage" aria-label="Autre langue" placeholder="+ Autre" defaultValue={otherLangs[0] ?? ""} style={{ width: 160, minHeight: 40, padding: "8px 12px" }} />
                </div>
                <div className="fgrid">
                  <label className="field">
                    Tarif horaire HT (€) <span className="req">*</span>
                    <input className="input" name="rate" inputMode="decimal" required defaultValue={f?.hourlyRateCents ? f.hourlyRateCents / 100 : ""} placeholder="30" />
                    <span className="hint">
                      Minimum selon le poste principal : {SIGNUP_ROLE_ORDER.map((r) => `${ROLES[r].short} ${hourly(pricing.floors[r])}`).join(" · ")}. Affiché aux exposants.
                    </span>
                  </label>
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <p className="muted">Quand l’exposant prête une tenue, il la prépare à votre taille avant votre arrivée.</p>
                <div className="fgrid3">
                  <label className="field">
                    Haut
                    <select className="input" name="top" defaultValue={f?.topSize ?? "M"}>
                      {TOPS.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    Pantalon / jupe
                    <select className="input" name="pants" defaultValue={f?.pantsSize ?? "40"}>
                      {Array.from({ length: 9 }, (_, i) => String(34 + i * 2)).map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    Pointure
                    <select className="input" name="shoe" defaultValue={f?.shoeSize ?? "40"}>
                      {Array.from({ length: 13 }, (_, i) => String(35 + i)).map((t) => (
                        <option key={t}>{t}</option>
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
                    SIRET <span className="req">*</span>
                    <input className="input" name="siret" inputMode="numeric" required defaultValue={f?.siret ? formatSiret(f.siret) : ""} />
                  </label>
                  <label className="field">
                    Statut
                    <select className="input" name="legalStatus" defaultValue={f?.legalStatus ?? "Auto-entrepreneur"}>
                      <option>Auto-entrepreneur</option>
                      <option>Entreprise individuelle</option>
                      <option>Société (EURL, SASU…)</option>
                    </select>
                  </label>
                </div>
                <h2 className="ptitle">Documents</h2>
                <p className="muted small">PDF, JPG ou PNG, 20 Mo maximum. Stockés séparément, consultés uniquement par l’équipe de vérification.</p>
                {(["identite", "urssaf", "rib", "siret"] as DocumentKey[]).map((t) => {
                  const d = docs.find((x) => x.type === t);
                  return (
                    <div key={t} className="sunk drop">
                      <span className="clay s ic" style={{ ["--c" as string]: "#68D1A4" }} aria-hidden="true"></span>
                      <div>
                        <label htmlFor={`doc_${t}`}>
                          <b>{DOCUMENT_TYPES[t]}</b> {t !== "siret" && <span className="req">*</span>}
                        </label>
                        <p className="muted small">
                          {d ? (
                            <>
                              {d.filename} ·{" "}
                              <Status tone={d.status === "valide" ? "ok" : d.status === "refuse" ? "warn" : "info"}>
                                {d.status === "valide" ? "Validé" : d.status === "refuse" ? `À corriger${d.comment ? ` : ${d.comment}` : ""}` : "Reçu"}
                              </Status>
                            </>
                          ) : t === "siret" ? (
                            "Facultatif : accélère la vérification."
                          ) : (
                            "À déposer"
                          )}
                        </p>
                      </div>
                      <input id={`doc_${t}`} className="input" type="file" name={`doc_${t}`} accept=".pdf,.jpg,.jpeg,.png" style={{ maxWidth: 280 }} />
                      {t === "urssaf" && (
                        <label className="field" style={{ flexBasis: "100%" }}>
                          Date de délivrance de l’attestation (elle vaut 6 mois)
                          <input className="input" type="date" name="urssafIssuedOn" defaultValue={d?.issuedOn ?? ""} style={{ maxWidth: 220 }} />
                        </label>
                      )}
                    </div>
                  );
                })}
                <h2 className="ptitle">Facturation</h2>
                <p className="muted small">
                  Après chaque mission, Standby établit la facture à votre nom (autofacturation) et vous la met à disposition avec votre relevé de paie.
                </p>
                <BillingFields f={f} />
              </>
            )}
            <div className="nav-row">
              {step > 1 ? (
                <Link className="clay btn ghost" href={`/inscription/commercial?etape=${step - 1}`}>
                  Retour
                </Link>
              ) : (
                <span></span>
              )}
              <Submit className="clay btn butter">{step === 4 ? "Envoyer mon profil ✓" : "Continuer →"}</Submit>
            </div>
          </ActionForm>
        </section>
        <Why
          color="#1C8755"
          items={[
            ["Spécialités et langues", "elles font remonter votre profil sur les bons événements."],
            ["Tailles", "l’exposant prépare votre tenue avant votre arrivée."],
            ["SIRET et URSSAF", "obligatoires pour facturer en auto-entrepreneur."],
            ["RIB", "virement chaque lundi pour la semaine travaillée."],
            ["Mandat de facturation", "vos factures sont établies pour vous, avec la bonne mention de TVA."],
          ]}
        />
      </div>
    </>
  );
}
