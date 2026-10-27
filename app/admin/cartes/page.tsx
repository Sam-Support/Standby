import { asc, eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { ActionForm, Submit } from "@/components/action-form";
import { PageHead } from "@/components/ui";
import { longDateTime } from "@/lib/format";
import { fileUrl } from "@/lib/storage";
import { transcribeAction } from "../actions";

export const metadata = { title: "Cartes de visite à saisir" };

export default async function Page() {
  const db = await getDb();
  const cards = await db
    .select({ card: s.businessCards, b: s.bookings, c: s.companies })
    .from(s.businessCards)
    .innerJoin(s.leadBatches, eq(s.leadBatches.id, s.businessCards.batchId))
    .innerJoin(s.bookings, eq(s.bookings.id, s.leadBatches.bookingId))
    .innerJoin(s.companies, eq(s.companies.id, s.bookings.companyId))
    .where(eq(s.businessCards.status, "a_saisir"))
    .orderBy(asc(s.businessCards.createdAt))
    .limit(50);
  return (
    <>
      <PageHead label="Administration" title="Cartes de visite à saisir">
        Cartes non lues automatiquement. Engagement : saisie sous 24 h. Les leads sont ajoutés au format de l’entreprise (et poussés dans son CRM).
      </PageHead>
      {cards.length === 0 && <p className="muted">Aucune carte en attente.</p>}
      <div className="grid2">
        {cards.map(({ card, b, c }) => (
          <section key={card.id} className="clay panel">
            <span className="muted small">
              {c.name} · {b.ref} · reçue le {longDateTime(card.createdAt)}
            </span>
            <a href={fileUrl(card.path)!} target="_blank" rel="noopener">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fileUrl(card.path)!} alt="Carte de visite à saisir" style={{ width: "100%", maxHeight: 260, objectFit: "contain", borderRadius: 12, background: "#fff" }} />
            </a>
            <ActionForm action={transcribeAction.bind(null, card.id)} className="fgrid">
              <label className="field">Nom<input className="input" name="nom" /></label>
              <label className="field">Prénom<input className="input" name="prenom" /></label>
              <label className="field">Société<input className="input" name="societe" /></label>
              <label className="field">Fonction<input className="input" name="fonction" /></label>
              <label className="field">E-mail<input className="input" name="email" type="email" /></label>
              <label className="field">Téléphone<input className="input" name="telephone" /></label>
              <Submit className="clay s btn sm">Enregistrer le lead</Submit>
            </ActionForm>
          </section>
        ))}
      </div>
    </>
  );
}
