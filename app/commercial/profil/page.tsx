import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { ActionForm, Submit } from "@/components/action-form";
import { BillingFields } from "@/components/billing-fields";
import { OrderedChips } from "@/components/ordered-chips";
import { BackLink, Chip, PageHead, Status } from "@/components/ui";
import { getCurrentUser, requireFreelancer } from "@/lib/auth/session";
import { DOCUMENT_TYPES, LANGUAGES, ROLES, SIGNUP_ROLE_ORDER, SPECIALTIES, type DocumentKey } from "@/lib/domain";
import { daysUntil, longDate, rating } from "@/lib/format";
import { formatSiret } from "@/lib/siret";
import { SIRET_LABELS } from "@/lib/services/compliance";
import { stripeEnabled } from "@/lib/integrations/stripe";
import { reviewsFor } from "@/lib/services/reviews";
import { stripeSetupAction, updateBillingAction, updateIdentityAction, updateProfileAction, uploadDocAction } from "../actions";

export const metadata = { title: "Mon profil" };

const TOPS = ["XS", "S", "M", "L", "XL", "XXL"];

export default async function Page({ searchParams }: { searchParams: Promise<{ stripe?: string }> }) {
  const { stripe } = await searchParams;
  const f = await requireFreelancer("/commercial/profil");
  const user = (await getCurrentUser())!;
  const db = await getDb();
  const docs = await db.select().from(s.freelancerDocuments).where(eq(s.freelancerDocuments.freelancerId, f.id));
  const reviews = await reviewsFor(db, { freelancerId: f.id });
  return (
    <>
      <BackLink href="/commercial">Espace commercial</BackLink>
      <PageHead label="Espace commercial" title="Mon profil">
        Visible des exposants dès la validation de vos documents. Vos documents ne sont jamais partagés.
      </PageHead>
      {stripe === "retour" && <p className="note info">Retour de Stripe : vos virements sont activés dès que Stripe a vérifié vos informations.</p>}
      <div className="grid2">
        <section className="clay panel">
          <h2>Identité</h2>
          <ActionForm action={updateIdentityAction} className="stack" style={{ gap: 14 }}>
            <div className="fgrid">
              <label className="field">Prénom<input className="input" name="firstName" defaultValue={user.firstName} /></label>
              <label className="field">Nom<input className="input" name="lastName" defaultValue={user.lastName} /></label>
              <label className="field">Téléphone<input className="input" name="phone" defaultValue={user.phone ?? ""} /></label>
              <label className="field">Ville<input className="input" name="city" defaultValue={f.city} /></label>
            </div>
            <label className="field">Présentation<textarea className="input" name="bio" defaultValue={f.bio ?? ""}></textarea></label>
            <Submit className="clay s btn sm">Enregistrer</Submit>
          </ActionForm>
        </section>
        <section className="clay panel">
          <h2>Documents et virements</h2>
          {f.blockedReason && <p className="note err">Profil retiré du matching : {f.blockedReason}.</p>}
          <p className="small">
            SIRET {f.siret ? formatSiret(f.siret) : "—"} :{" "}
            <Status tone={f.siretStatus === "actif" ? "ok" : f.siretStatus === "inconnu" ? "info" : "warn"}>{SIRET_LABELS[f.siretStatus] ?? f.siretStatus}</Status>
          </p>
          {(["identite", "urssaf", "rib", "siret"] as DocumentKey[]).map((t) => {
            const d = docs.find((x) => x.type === t);
            const expiresIn = d?.validUntil ? daysUntil(d.validUntil) : null;
            return (
              <ActionForm key={t} action={uploadDocAction.bind(null, t)} className="brow">
                <div>
                  <b>{DOCUMENT_TYPES[t]}</b>
                  <br />
                  {d ? (
                    <Status tone={d.status === "valide" && (expiresIn === null || expiresIn > 30) ? "ok" : d.status === "refuse" || (expiresIn !== null && expiresIn <= 30) ? "warn" : "info"}>
                      {d.status === "valide"
                        ? d.source === "stripe"
                          ? "Vérifié par Stripe"
                          : "Validé"
                        : d.status === "refuse"
                          ? `À corriger${d.comment ? ` : ${d.comment}` : ""}`
                          : "En vérification"}
                    </Status>
                  ) : (
                    <span className="muted small">Non fourni</span>
                  )}
                  {d?.validUntil && (
                    <span className="muted small">
                      {" "}
                      · {expiresIn! < 0 ? `expirée le ${longDate(d.validUntil)}` : `valable jusqu’au ${longDate(d.validUntil)}`}
                    </span>
                  )}
                </div>
                {d?.source !== "stripe" && (
                  <span className="inline" style={{ gap: 6 }}>
                    <input className="input" type="file" name="doc" accept=".pdf,.jpg,.jpeg,.png" aria-label={`Déposer ${DOCUMENT_TYPES[t]}`} style={{ maxWidth: 200, minHeight: 40 }} />
                    {t === "urssaf" && (
                      <input className="input" type="date" name="issuedOn" aria-label="Date de délivrance de l’attestation" style={{ maxWidth: 160, minHeight: 40 }} />
                    )}
                    <Submit className="clay s btn xs ghost" pending="…">Envoyer</Submit>
                  </span>
                )}
              </ActionForm>
            );
          })}
          <p className="muted small">
            L’attestation URSSAF vaut 6 mois : vous êtes relancé·e 30 puis 7 jours avant l’échéance. Une fois les virements activés via Stripe, la pièce
            d’identité et le RIB sont validés automatiquement.
          </p>
          <div className="brow">
            <span>
              Virements : <Status tone={f.payoutsEnabled ? "ok" : "warn"}>{f.payoutsEnabled ? "activés" : "à activer"}</Status>
            </span>
            <ActionForm action={stripeSetupAction}>
              <Submit className="clay s btn xs">{f.payoutsEnabled ? "Mettre à jour mon IBAN" : stripeEnabled() ? "Activer via Stripe" : "Activer"}</Submit>
            </ActionForm>
          </div>
        </section>
        <section className="clay panel" id="facturation">
          <h2>Facturation</h2>
          {!f.billingMandateAcceptedAt && (
            <p className="note err">Acceptez le mandat de facturation pour recevoir des missions : sans lui, Standby ne peut pas établir vos factures.</p>
          )}
          <ActionForm action={updateBillingAction} className="stack" style={{ gap: 14 }}>
            <BillingFields f={f} />
            <p className="muted small">Les changements valent pour les factures suivantes ; les factures déjà émises ne sont pas modifiées.</p>
            <div>
              <Submit className="clay s btn sm">Enregistrer</Submit>
            </div>
          </ActionForm>
        </section>
        <section className="clay panel">
          <h2>Factures et relevés</h2>
          <p className="muted">
            Une facture est émise à votre nom à chaque virement (mission ou indemnité d’annulation). Retrouvez-les avec vos relevés mensuels et le
            récapitulatif annuel utile à votre déclaration de chiffre d’affaires.
          </p>
          <div>
            <Link className="clay s btn sm" href="/commercial/revenus">Voir mes factures et relevés</Link>
          </div>
        </section>
        <section className="clay panel" style={{ gridColumn: "1 / -1" }}>
          <h2>Postes, spécialités, langues, tarif et tenue</h2>
          <ActionForm action={updateProfileAction} className="stack" style={{ gap: 16 }}>
            <span className="stitle">Postes (le premier = principal)</span>
            <OrderedChips name="roles" options={SIGNUP_ROLE_ORDER.map((r) => ({ value: r, label: ROLES[r].label }))} initial={f.roles} />
            <span className="stitle">Spécialités</span>
            <div className="chips">
              {SPECIALTIES.map((sp) => (
                <Chip key={sp} name="specialties" value={sp} checked={f.specialties.includes(sp)}>{sp}</Chip>
              ))}
            </div>
            <span className="stitle">Langues</span>
            <div className="chips">
              {LANGUAGES.map((l) => (
                <Chip key={l} name="languages" value={l} checked={f.languages.includes(l)}>{l}</Chip>
              ))}
              <input className="input" name="otherLanguage" aria-label="Autre langue" placeholder="+ Autre" defaultValue={f.languages.find((l) => !LANGUAGES.includes(l)) ?? ""} style={{ width: 160, minHeight: 40, padding: "8px 12px" }} />
            </div>
            <div className="fgrid">
              <label className="field">Tarif horaire HT (€)<input className="input" name="rate" defaultValue={f.hourlyRateCents / 100} inputMode="decimal" /></label>
              <label className="field">
                Haut
                <select className="input" name="top" defaultValue={f.topSize ?? "M"}>
                  {TOPS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label className="field">Pantalon<input className="input" name="pants" defaultValue={f.pantsSize ?? ""} /></label>
              <label className="field">Pointure<input className="input" name="shoe" defaultValue={f.shoeSize ?? ""} /></label>
            </div>
            <Submit className="clay s btn sm">Enregistrer</Submit>
          </ActionForm>
        </section>
      </div>
      <section className="clay panel" id="avis">
        <h2>Avis reçus{f.ratingX10 ? ` · ★ ${rating(f.ratingX10)} (${f.ratingsCount})` : ""}</h2>
        {reviews.length === 0 && <p className="muted small">Pas encore d’avis : les exposants vous notent après validation des heures.</p>}
        {reviews.map(({ r, companyName, ref }) => (
          <div key={r.id} className="brow" style={{ flexDirection: "column", alignItems: "stretch", gap: 4 }}>
            <span>
              <b aria-label={`${r.rating} sur 5`}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</b> · {companyName} · {ref}
            </span>
            {r.comment && <p className="muted small">« {r.comment} »</p>}
          </div>
        ))}
      </section>
    </>
  );
}
