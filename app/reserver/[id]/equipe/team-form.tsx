"use client";

import Link from "@/components/link";
import { useState } from "react";
import { ActionForm, Submit } from "@/components/action-form";
import { BookingAside, RoleQtyRow, type AsideEvent } from "@/components/booking";
import type { FormState } from "@/lib/action";
import { useFmt, useMessages } from "@/components/i18n";
import type { CommissionType } from "@/lib/commission";
import { isProspectionRole, LANGUAGES, ROLES, ROLE_KEYS, type OfferKey, type OutfitKey, type RoleKey } from "@/lib/domain";
import { booking } from "@/lib/i18n/messages/booking";
import { domainLabels } from "@/lib/i18n/messages/domain";
import { features } from "@/lib/i18n/messages/features";
import { computeQuote } from "@/lib/pricing";

type Props = {
  id: string;
  action: (s: FormState, fd: FormData) => Promise<FormState>;
  kind: "salon" | "foire";
  initialOffer: OfferKey;
  initialQty: Partial<Record<RoleKey, number>>;
  initialLanguages: string[];
  initialOutfit: OutfitKey;
  initialCommission: { type: CommissionType; leadCents: number; saleBps: number };
  commissionDefaults: { leadCents: number; saleBps: number };
  floors: Record<RoleKey, number>;
  selectedRates: Partial<Record<RoleKey, number[]>>;
  serviceFeeBps: number;
  vatBps: number;
  aside: { event: AsideEvent; stand: string | null; days: number; minutesPerDay: number; startTime: string; endTime: string };
};

const PRESET: Record<"salon" | "foire" | "prospection", Partial<Record<RoleKey, number>>> = {
  salon: { commercial: 2, accueil: 1 },
  foire: { demonstrateur: 2, animateur: 1 },
  prospection: { prospecteur: 2 },
};

/** « 5,5 » (euros ou pourcentage) depuis des centimes ou des points de base. */
const decimal = (n: number) => String(n / 100).replace(".", ",");

export function TeamForm(p: Props) {
  const m = useMessages(booking);
  const x = useMessages(features);
  const t = m.team;
  const f = useFmt();
  const dl = domainLabels(f.lang);
  const [offer, setOffer] = useState<OfferKey>(p.initialOffer);
  const [qty, setQty] = useState<Partial<Record<RoleKey, number>>>(p.initialQty);
  const [outfit, setOutfit] = useState<OutfitKey>(p.initialOutfit);
  const [langs, setLangs] = useState<string[]>(p.initialLanguages.length ? p.initialLanguages : ["Français"]);
  const [commission, setCommission] = useState<CommissionType>(p.initialCommission.type);
  const other = p.initialLanguages.filter((l) => !LANGUAGES.includes(l));

  // seuls les postes de la formule choisie comptent (les autres restent en mémoire si l'on revient en arrière)
  const offerRoles = ROLE_KEYS.filter((r) => (offer === "prospection") === isProspectionRole(r));
  const quote = computeQuote({
    positions: offerRoles
      .filter((r) => (qty[r] ?? 0) > 0)
      .map((r) => {
        const rates = (p.selectedRates[r] ?? []).slice(0, qty[r]);
        while (rates.length < (qty[r] ?? 0)) rates.push(p.floors[r]);
        return { role: r, rates };
      }),
    days: p.aside.days,
    billableMinutesPerDay: p.aside.minutesPerDay,
    serviceFeeBps: p.serviceFeeBps,
    vatBps: p.vatBps,
  });

  const row = (r: RoleKey) => (
    <RoleQtyRow key={r} role={r} qty={qty[r] ?? 0} floorCents={p.floors[r]} name={`qty_${r}`} onChange={(n) => setQty({ ...qty, [r]: n })} />
  );

  const main = offerRoles.filter((r) => !ROLES[r].rare);
  const rare = offerRoles.filter((r) => ROLES[r].rare);
  const presetKey = offer === "prospection" ? "prospection" : p.kind;
  // la commission sur les ventes ne s'applique qu'à une équipe de stand
  const commissionChoice: CommissionType = offer === "prospection" && commission === "vente" ? "lead" : commission;
  const leadDefault = p.initialCommission.type === "lead" && p.initialCommission.leadCents ? p.initialCommission.leadCents : p.commissionDefaults.leadCents;
  const saleDefault = p.initialCommission.type === "vente" && p.initialCommission.saleBps ? p.initialCommission.saleBps : p.commissionDefaults.saleBps;

  return (
    <div className="layout">
      <section className="clay main">
        <ActionForm action={p.action} className="stack" style={{ gap: 18 }}>
          <h2 className="ptitle">{x.offer.title}</h2>
          <fieldset className="seg sunk" style={{ border: 0, margin: 0 }}>
            <legend className="sr-only">{x.offer.title}</legend>
            {(["stand", "prospection"] as OfferKey[]).map((o) => (
              <label key={o}>
                <input type="radio" name="offer" value={o} checked={offer === o} onChange={() => setOffer(o)} />
                {o === "stand" ? x.offer.stand : x.offer.prospection}
              </label>
            ))}
          </fieldset>
          <p className="muted small">{offer === "stand" ? x.offer.standHint : x.offer.prospectionHint}</p>

          <h2 className="ptitle">{offer === "stand" ? t.who : x.offer.who}</h2>
          <div className="sunk row-between" style={{ borderRadius: 20, padding: "14px 16px", fontSize: 14 }}>
            <span>
              {offer === "stand" ? t.preset(p.kind === "salon") : `${x.offer.prospection} : `}
              <b>{offer === "prospection" ? x.offer.presetProspection : p.kind === "salon" ? t.presetSalon : t.presetFair}</b>
            </span>
            <button type="button" className="clay s btn xs ghost" onClick={() => setQty({ ...qty, ...Object.fromEntries(offerRoles.map((r) => [r, 0])), ...PRESET[presetKey] })}>
              {t.apply}
            </button>
          </div>
          <div className="stack">{main.map(row)}</div>
          {rare.length > 0 && (
            <details className="sunk more" open={rare.some((r) => (qty[r] ?? 0) > 0)}>
              <summary>{t.rare}</summary>
              <div className="stack" style={{ padding: "6px 2px 2px" }}>
                {rare.map(row)}
              </div>
            </details>
          )}

          <h2 className="ptitle">{t.languages}</h2>
          <div className="chips">
            {LANGUAGES.map((l) => (
              <label key={l} className="clay s chip">
                <input type="checkbox" name="languages" value={l} checked={langs.includes(l)} onChange={(e) => setLangs(e.target.checked ? [...langs, l] : langs.filter((y) => y !== l))} />
                {dl.language(l)}
              </label>
            ))}
            <input className="input" name="otherLanguage" aria-label={t.otherLanguage} placeholder={t.other} defaultValue={other[0] ?? ""} style={{ width: 160, minHeight: 40, padding: "8px 12px" }} />
          </div>

          {offer === "stand" ? (
            <>
              <h2 className="ptitle">{t.outfit}</h2>
              <fieldset className="seg sunk" style={{ border: 0, margin: 0 }}>
                <legend className="sr-only">{t.outfit}</legend>
                {(
                  [
                    ["exposant", t.outfits.exposant],
                    ["perso", t.outfits.perso],
                  ] as [OutfitKey, string][]
                ).map(([v, l]) => (
                  <label key={v}>
                    <input type="radio" name="outfit" value={v} checked={outfit === v} onChange={() => setOutfit(v)} />
                    {l}
                  </label>
                ))}
              </fieldset>
            </>
          ) : (
            <input type="hidden" name="outfit" value="perso" />
          )}

          <h2 className="ptitle">{x.commission.title}</h2>
          <fieldset className="seg sunk" style={{ border: 0, margin: 0 }}>
            <legend className="sr-only">{x.commission.title}</legend>
            {(["aucune", "lead", ...(offer === "stand" ? ["vente"] : [])] as CommissionType[]).map((c) => (
              <label key={c}>
                <input type="radio" name="commissionType" value={c} checked={commissionChoice === c} onChange={() => setCommission(c)} />
                {c === "aucune" ? x.commission.none : c === "lead" ? x.commission.lead : x.commission.sale}
              </label>
            ))}
          </fieldset>
          {commissionChoice === "lead" && (
            <label className="field" style={{ maxWidth: 260 }}>
              {x.commission.leadAmount}
              <input className="input" name="commissionLead" inputMode="decimal" required defaultValue={decimal(leadDefault)} />
            </label>
          )}
          {commissionChoice === "vente" && (
            <label className="field" style={{ maxWidth: 260 }}>
              {x.commission.saleRate}
              <input className="input" name="commissionSale" inputMode="decimal" required defaultValue={decimal(saleDefault)} />
            </label>
          )}
          <p className="muted small">{x.commission.hint}</p>

          <div className="nav-row">
            <Link className="clay btn ghost" href={`/reserver/${p.id}/evenement`}>
              {m.back}
            </Link>
            <Submit disabled={quote.people === 0}>{t.next}</Submit>
          </div>
        </ActionForm>
      </section>
      <BookingAside {...p.aside} people={quote.people} quote={quote}>
        {commissionChoice !== "aucune" && <p className="muted small">{x.commission.asideNote}</p>}
      </BookingAside>
    </div>
  );
}

