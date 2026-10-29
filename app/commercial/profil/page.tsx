import Link from "@/components/link";
import { eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { ActionForm, Submit } from "@/components/action-form";
import { BillingFields } from "@/components/billing-fields";
import { OrderedChips } from "@/components/ordered-chips";
import { BackLink, Chip, PageHead, Status } from "@/components/ui";
import { getCurrentUser, requireFreelancer } from "@/lib/auth/session";
import { LANGUAGES, SIGNUP_ROLE_ORDER, SPECIALTIES, type DocumentKey } from "@/lib/domain";
import { daysUntil } from "@/lib/format";
import { domainLabels } from "@/lib/i18n/messages/domain";
import { freelancer as messages } from "@/lib/i18n/messages/freelancer";
import { getFmt, getMessages, sayParts } from "@/lib/i18n/server";
import { formatSiret } from "@/lib/siret";
import { stripeEnabled } from "@/lib/integrations/stripe";
import { reviewsFor } from "@/lib/services/reviews";
import { stripeSetupAction, updateBillingAction, updateIdentityAction, updateProfileAction, uploadDocAction } from "../actions";

export async function generateMetadata() {
  return { title: (await getMessages(messages)).profile.title };
}

const TOPS = ["XS", "S", "M", "L", "XL", "XXL"];

export default async function Page({ searchParams }: { searchParams: Promise<{ stripe?: string }> }) {
  const { stripe } = await searchParams;
  const f = await requireFreelancer("/commercial/profil");
  const user = (await getCurrentUser())!;
  const db = await getDb();
  const docs = await db.select().from(s.freelancerDocuments).where(eq(s.freelancerDocuments.freelancerId, f.id));
  const reviews = await reviewsFor(db, { freelancerId: f.id });
  const all = await getMessages(messages);
  const t = all.profile;
  const fm = await getFmt();
  const dl = domainLabels(fm.lang);
  return (
    <>
      <BackLink href="/commercial">{all.area}</BackLink>
      <PageHead label={all.area} title={t.title}>
        {t.lead}
      </PageHead>
      {stripe === "retour" && <p className="note info">{t.stripeBack}</p>}
      <div className="grid2">
        <section className="clay panel">
          <h2>{t.identity}</h2>
          <ActionForm action={updateIdentityAction} className="stack" style={{ gap: 14 }}>
            <div className="fgrid">
              <label className="field">{t.firstName}<input className="input" name="firstName" defaultValue={user.firstName} /></label>
              <label className="field">{t.lastName}<input className="input" name="lastName" defaultValue={user.lastName} /></label>
              <label className="field">{t.phone}<input className="input" name="phone" defaultValue={user.phone ?? ""} /></label>
              <label className="field">{t.city}<input className="input" name="city" defaultValue={f.city} /></label>
            </div>
            <label className="field">{t.bio}<textarea className="input" name="bio" defaultValue={f.bio ?? ""}></textarea></label>
            <Submit className="clay s btn sm">{all.save}</Submit>
          </ActionForm>
        </section>
        <section className="clay panel">
          <h2>{t.docs}</h2>
          {f.blockedReason && <p className="note err">{t.blocked(await sayParts(f.blockedReason))}</p>}
          <p className="small">
            SIRET {f.siret ? formatSiret(f.siret) : "—"} :{" "}
            <Status tone={f.siretStatus === "actif" ? "ok" : f.siretStatus === "inconnu" ? "info" : "warn"}>{t.siret[f.siretStatus] ?? f.siretStatus}</Status>
          </p>
          {(["identite", "urssaf", "rib", "siret"] as DocumentKey[]).map((k) => {
            const d = docs.find((x) => x.type === k);
            const expiresIn = d?.validUntil ? daysUntil(d.validUntil) : null;
            return (
              <ActionForm key={k} action={uploadDocAction.bind(null, k)} className="brow">
                <div>
                  <b>{dl.document(k)}</b>
                  <br />
                  {d ? (
                    <Status tone={d.status === "valide" && (expiresIn === null || expiresIn > 30) ? "ok" : d.status === "refuse" || (expiresIn !== null && expiresIn <= 30) ? "warn" : "info"}>
                      {d.status === "valide" ? (d.source === "stripe" ? t.stripeVerified : t.valid) : d.status === "refuse" ? t.fix(d.comment) : t.checking}
                    </Status>
                  ) : (
                    <span className="muted small">{t.missing}</span>
                  )}
                  {d?.validUntil && (
                    <span className="muted small">
                      {" "}
                      · {expiresIn! < 0 ? t.expired(fm.longDate(d.validUntil)) : t.validUntil(fm.longDate(d.validUntil))}
                    </span>
                  )}
                </div>
                {d?.source !== "stripe" && (
                  <span className="inline" style={{ gap: 6 }}>
                    <input className="input" type="file" name="doc" accept=".pdf,.jpg,.jpeg,.png" aria-label={t.uploadDoc(dl.document(k))} style={{ maxWidth: 200, minHeight: 40 }} />
                    {k === "urssaf" && <input className="input" type="date" name="issuedOn" aria-label={t.issuedOn} style={{ maxWidth: 160, minHeight: 40 }} />}
                    <Submit className="clay s btn xs ghost" pending="…">
                      {t.send}
                    </Submit>
                  </span>
                )}
              </ActionForm>
            );
          })}
          <p className="muted small">{t.docsHelp}</p>
          <div className="brow">
            <span>
              {t.payouts} <Status tone={f.payoutsEnabled ? "ok" : "warn"}>{f.payoutsEnabled ? t.enabled : t.toEnable}</Status>
            </span>
            <ActionForm action={stripeSetupAction}>
              <Submit className="clay s btn xs">{f.payoutsEnabled ? t.updateIban : stripeEnabled() ? t.enableStripe : t.enable}</Submit>
            </ActionForm>
          </div>
        </section>
        <section className="clay panel" id="facturation">
          <h2>{t.billing}</h2>
          {!f.billingMandateAcceptedAt && <p className="note err">{t.noMandate}</p>}
          <ActionForm action={updateBillingAction} className="stack" style={{ gap: 14 }}>
            <BillingFields f={f} />
            <p className="muted small">{t.billingHelp}</p>
            <div>
              <Submit className="clay s btn sm">{all.save}</Submit>
            </div>
          </ActionForm>
        </section>
        <section className="clay panel">
          <h2>{t.invoices}</h2>
          <p className="muted">{t.invoicesText}</p>
          <div>
            <Link className="clay s btn sm" href="/commercial/revenus">
              {t.seeInvoices}
            </Link>
          </div>
        </section>
        <section className="clay panel" style={{ gridColumn: "1 / -1" }}>
          <h2>{t.skills}</h2>
          <ActionForm action={updateProfileAction} className="stack" style={{ gap: 16 }}>
            <span className="stitle">{t.roles}</span>
            <OrderedChips name="roles" options={SIGNUP_ROLE_ORDER.map((r) => ({ value: r, label: dl.role(r).label }))} initial={f.roles} />
            <span className="stitle">{t.specialties}</span>
            <div className="chips">
              {SPECIALTIES.map((sp) => (
                <Chip key={sp} name="specialties" value={sp} checked={f.specialties.includes(sp)}>{dl.specialty(sp)}</Chip>
              ))}
            </div>
            <span className="stitle">{t.languages}</span>
            <div className="chips">
              {LANGUAGES.map((l) => (
                <Chip key={l} name="languages" value={l} checked={f.languages.includes(l)}>{dl.language(l)}</Chip>
              ))}
              <input className="input" name="otherLanguage" aria-label={t.otherLanguage} placeholder={t.other} defaultValue={f.languages.find((l) => !LANGUAGES.includes(l)) ?? ""} style={{ width: 160, minHeight: 40, padding: "8px 12px" }} />
            </div>
            <div className="fgrid">
              <label className="field">{t.rate}<input className="input" name="rate" defaultValue={f.hourlyRateCents / 100} inputMode="decimal" /></label>
              <label className="field">
                {t.top}
                <select className="input" name="top" defaultValue={f.topSize ?? "M"}>
                  {TOPS.map((x) => <option key={x}>{x}</option>)}
                </select>
              </label>
              <label className="field">{t.pants}<input className="input" name="pants" defaultValue={f.pantsSize ?? ""} /></label>
              <label className="field">{t.shoe}<input className="input" name="shoe" defaultValue={f.shoeSize ?? ""} /></label>
            </div>
            <Submit className="clay s btn sm">{all.save}</Submit>
          </ActionForm>
        </section>
      </div>
      <section className="clay panel" id="avis">
        <h2>
          {t.reviews}
          {f.ratingX10 ? ` · ★ ${fm.rating(f.ratingX10)} (${f.ratingsCount})` : ""}
        </h2>
        {reviews.length === 0 && <p className="muted small">{t.noReviews}</p>}
        {reviews.map(({ r, companyName, ref }) => (
          <div key={r.id} className="brow" style={{ flexDirection: "column", alignItems: "stretch", gap: 4 }}>
            <span>
              <b aria-label={t.outOf(r.rating)}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</b> · {companyName} · {ref}
            </span>
            {r.comment && <p className="muted small">« {r.comment} »</p>}
          </div>
        ))}
      </section>
    </>
  );
}
