import { desc } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { ActionForm, Submit } from "@/components/action-form";
import { PageHead } from "@/components/ui";
import { PRICING_DEFAULTS } from "@/lib/domain";
import { eurosPrecise, longDate, longDateTime, percent, todayIso } from "@/lib/format";
import { getPricing } from "@/lib/settings";
import { setPricingAction } from "../actions";

export const metadata = { title: "Tarification" };

export default async function Page() {
  const db = await getDb();
  const pricing = await getPricing(db);
  const history = await db.select().from(s.pricingSettings).orderBy(desc(s.pricingSettings.createdAt)).limit(60);
  const fmt = (key: string, v: number) => (PRICING_DEFAULTS[key]?.unit === "bps" ? percent(v) : eurosPrecise(v));
  const now = new Date();

  return (
    <>
      <PageHead label="Administration" title="Tarification et commissions">
        Chaque modification prend effet à la date choisie. Les réservations déjà confirmées gardent les taux en vigueur à leur confirmation.
      </PageHead>
      <section className="clay panel">
        <h2>Réglages en vigueur</h2>
        {Object.entries(PRICING_DEFAULTS).map(([key, def]) => (
          <ActionForm key={key} action={setPricingAction.bind(null, key)} className="brow">
            <div style={{ flex: "1 1 260px" }}>
              <b>{def.label}</b>
              <br />
              <span className="muted small">Actuel : {fmt(key, pricing.raw[key])}</span>
            </div>
            <span className="inline" style={{ gap: 8 }}>
              <label className="sr-only" htmlFor={`v-${key}`}>Nouvelle valeur</label>
              <input
                id={`v-${key}`}
                className="input"
                name="value"
                required
                inputMode="decimal"
                defaultValue={def.unit === "bps" ? pricing.raw[key] / 100 : pricing.raw[key] / 100}
                style={{ width: 100, minHeight: 40, padding: "8px 12px" }}
              />
              <span className="muted small">{def.unit === "bps" ? "%" : "€"}</span>
              <label className="sr-only" htmlFor={`d-${key}`}>Date d’effet</label>
              <input id={`d-${key}`} className="input" type="date" name="effectiveFrom" defaultValue={todayIso()} style={{ width: 170, minHeight: 40, padding: "8px 12px" }} />
              <Submit className="clay s btn xs" pending="…">Appliquer</Submit>
            </span>
          </ActionForm>
        ))}
      </section>
      <section className="clay panel">
        <h2>Historique</h2>
        <div className="tblwrap">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">Réglage</th>
                <th scope="col">Valeur</th>
                <th scope="col">Effet à partir du</th>
                <th scope="col">Saisi le</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>{PRICING_DEFAULTS[h.key]?.label ?? h.key}</td>
                  <td>{fmt(h.key, h.value)}</td>
                  <td>
                    {longDate(h.effectiveFrom)}
                    {h.effectiveFrom > now ? " (à venir)" : ""}
                  </td>
                  <td>{longDateTime(h.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
