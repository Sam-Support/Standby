import Link from "@/components/link";
import { VAT_REGIMES } from "@/lib/domain";
import { domainLabels } from "@/lib/i18n/messages/domain";
import { signup } from "@/lib/i18n/messages/signup";
import { getFmt, getMessages } from "@/lib/i18n/server";

type Billing = {
  billingAddress: string | null;
  vatRegime: string;
  vatNumber: string | null;
  billingMandateAcceptedAt: Date | null;
  billingMandateVersion: string | null;
};

/** Adresse, régime de TVA et mandat d'autofacturation (inscription étape 4 et profil). */
export async function BillingFields({ f }: { f?: Billing | null }) {
  const t = (await getMessages(signup)).billing;
  const fm = await getFmt();
  const dl = domainLabels(fm.lang);
  return (
    <div className="stack billing" style={{ gap: 14 }}>
      <label className="field">
        <span>
          {t.address} <span className="req">*</span>
        </span>
        <input className="input" name="billingAddress" autoComplete="street-address" required defaultValue={f?.billingAddress ?? ""} placeholder={t.addressPlaceholder} />
        <span className="hint">{t.addressHint}</span>
      </label>
      <fieldset>
        <legend className="field">{t.regime}</legend>
        {(Object.keys(VAT_REGIMES) as (keyof typeof VAT_REGIMES)[]).map((k) => (
          <label key={k} className="check">
            <input type="radio" name="vatRegime" value={k} defaultChecked={(f?.vatRegime ?? "franchise") === k} />
            {dl.vatRegime(k)}
            {k === "franchise" ? t.franchise : t.assujetti}
          </label>
        ))}
      </fieldset>
      <label className="field when when-vat">
        {t.vatNumber}
        <input className="input" name="vatNumber" defaultValue={f?.vatNumber ?? ""} placeholder="FR12345678901" />
      </label>
      {f?.billingMandateAcceptedAt ? (
        <p className="muted small">
          {t.accepted(fm.longDate(f.billingMandateAcceptedAt), f.billingMandateVersion)}
          <Link href="/mandat-facturation">{t.read}</Link>
        </p>
      ) : (
        <label className="check">
          <input type="checkbox" name="acceptMandate" required />
          <span>
            {t.acceptBefore}
            <Link href="/mandat-facturation" target="_blank">
              {t.mandate}
            </Link>
            {t.acceptAfter}
          </span>
        </label>
      )}
    </div>
  );
}
