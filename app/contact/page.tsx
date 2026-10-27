import Link from "next/link";
import { ActionForm, Submit } from "@/components/action-form";
import { SegOption } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/session";
import { sendContact } from "./actions";

export const metadata = { title: "Nous contacter" };

export default async function Page({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  const user = await getCurrentUser();
  return (
    <>
      <div className="head">
        <div>
          <span className="lab">Aide</span>
          <h1>Nous contacter</h1>
          <p>
            Une question sur une réservation, une mission ou votre compte ? Notre équipe répond en jours ouvrés. Pensez à consulter la{" "}
            <Link href="/aide">FAQ</Link>, la réponse s’y trouve peut-être déjà.
          </p>
        </div>
      </div>
      <div className="layout">
        <section className="clay main">
          <h2 className="ptitle">Votre message</h2>
          <ActionForm action={sendContact} className="stack" style={{ gap: 18 }}>
            <fieldset className="seg sunk" style={{ border: 0, margin: 0 }}>
              <legend className="sr-only">Vous êtes</legend>
              <SegOption name="audience" value="entreprise" checked={user?.role !== "commercial"}>Entreprise</SegOption>
              <SegOption name="audience" value="commercial" checked={user?.role === "commercial"}>Commercial·e</SegOption>
              <SegOption name="audience" value="autre">Autre</SegOption>
            </fieldset>
            <div className="fgrid">
              <label className="field">
                Nom et prénom <span className="sr-only">(obligatoire)</span>
                <input className="input" name="name" required autoComplete="name" defaultValue={user ? `${user.firstName} ${user.lastName}` : ""} />
              </label>
              <label className="field">
                Adresse e-mail professionnelle
                <input className="input" name="email" type="email" required autoComplete="email" defaultValue={user?.email ?? ""} />
              </label>
              <label className="field">
                Sujet
                <select className="input" name="subject" defaultValue={ref ? "Une réservation en cours" : undefined}>
                  <option>Une réservation en cours</option>
                  <option>Une mission</option>
                  <option>Les heures ou la paie</option>
                  <option>La facturation</option>
                  <option>Mon compte</option>
                  <option>Accessibilité</option>
                  <option>Autre demande</option>
                </select>
              </label>
              <label className="field">
                Référence de réservation (facultatif)
                <input className="input" name="ref" placeholder="SB-0000-0000" defaultValue={ref ?? ""} />
              </label>
            </div>
            <label className="field">
              Message
              <textarea className="input" name="message" required minLength={10} placeholder="Décrivez votre demande…" style={{ minHeight: 150 }}></textarea>
            </label>
            <label className="check">
              <input type="checkbox" name="consent" required />
              <span className="muted small">
                J’accepte que mes données soient utilisées pour traiter ma demande, conformément à la{" "}
                <Link href="/confidentialite">politique de confidentialité</Link>.
              </span>
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Submit>Envoyer le message</Submit>
            </div>
          </ActionForm>
        </section>
        <aside className="clay aside">
          <h2 className="ptitle">Coordonnées</h2>
          <dl>
            <div className="kv"><dt className="lab">E-mail</dt><dd><span className="todo">[adresse e-mail]</span></dd></div>
            <div className="kv"><dt className="lab">Téléphone</dt><dd><span className="todo">[numéro]</span></dd></div>
            <div className="kv"><dt className="lab">Adresse</dt><dd><span className="todo">[adresse postale]</span></dd></div>
          </dl>
          <div className="sunk" style={{ borderRadius: 20, padding: "16px 18px" }}>
            <span className="lab">Horaires</span>
            <p style={{ marginTop: 6 }}>
              Du lundi au vendredi, <span className="todo">[9 h – 18 h]</span>
            </p>
            <p className="muted small" style={{ marginTop: 8 }}>
              Pendant un événement, une ligne d’urgence est disponible pour les entreprises présentes sur place.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
