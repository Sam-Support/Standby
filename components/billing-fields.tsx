import Link from "next/link";
import { VAT_REGIMES } from "@/lib/domain";
import { longDate } from "@/lib/format";

type Billing = {
  billingAddress: string | null;
  vatRegime: string;
  vatNumber: string | null;
  billingMandateAcceptedAt: Date | null;
  billingMandateVersion: string | null;
};

/** Adresse, régime de TVA et mandat d'autofacturation (inscription étape 4 et profil). */
export function BillingFields({ f }: { f?: Billing | null }) {
  return (
    <div className="stack billing" style={{ gap: 14 }}>
      <label className="field">
        <span>
          Adresse de facturation <span className="req">*</span>
        </span>
        <input className="input" name="billingAddress" autoComplete="street-address" required defaultValue={f?.billingAddress ?? ""} placeholder="12 rue des Lilas, 69003 Lyon" />
        <span className="hint">Elle figure sur les factures émises à votre nom.</span>
      </label>
      <fieldset>
        <legend className="field">Régime de TVA</legend>
        {(Object.keys(VAT_REGIMES) as (keyof typeof VAT_REGIMES)[]).map((k) => (
          <label key={k} className="check">
            <input type="radio" name="vatRegime" value={k} defaultChecked={(f?.vatRegime ?? "franchise") === k} />
            {VAT_REGIMES[k]}
            {k === "franchise" ? " : TVA non applicable, art. 293 B du CGI" : " : la TVA s’ajoute à votre facture et vous est versée"}
          </label>
        ))}
      </fieldset>
      <label className="field when when-vat">
        N° de TVA intracommunautaire
        <input className="input" name="vatNumber" defaultValue={f?.vatNumber ?? ""} placeholder="FR12345678901" />
      </label>
      {f?.billingMandateAcceptedAt ? (
        <p className="muted small">
          Mandat de facturation accepté le {longDate(f.billingMandateAcceptedAt)} (version {f.billingMandateVersion}). <Link href="/mandat-facturation">Lire le mandat</Link>
        </p>
      ) : (
        <label className="check">
          <input type="checkbox" name="acceptMandate" required />
          <span>
            J’accepte le <Link href="/mandat-facturation" target="_blank">mandat de facturation</Link> : Standby émet mes factures en mon nom et pour mon
            compte après chaque mission, je n’ai rien à facturer moi-même.
          </span>
        </label>
      )}
    </div>
  );
}
