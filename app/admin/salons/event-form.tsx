import { ActionForm, Submit } from "@/components/action-form";
import type { schema } from "@/db";
import { EventArt } from "@/components/event-art";
import { SPECIALTIES } from "@/lib/domain";
import { LOGO_RULES, logoFits, logoProblem } from "@/lib/logo";
import { fileUrl } from "@/lib/storage";
import { removeLogoAction, saveEventAction } from "../actions";

type EventRow = typeof schema.events.$inferSelect;

/** Ce qui s'affiche sur le site pour ce logo, et pourquoi. */
export function logoStatus(e: Pick<EventRow, "logoPath" | "logoWidth" | "logoHeight" | "logoAuthorized">) {
  if (!e.logoPath) return { shown: false, text: "Pas de logo : le nom du salon s’affiche sur sa couleur." };
  const size = e.logoWidth && e.logoHeight ? { width: e.logoWidth, height: e.logoHeight, vector: e.logoPath.endsWith(".svg") } : null;
  if (!logoFits(size)) return { shown: false, text: `Logo hors dimensions (${size ? logoProblem(size) : "dimensions inconnues, déposez-le à nouveau"}) : le nom du salon s’affiche à la place.` };
  if (!e.logoAuthorized) return { shown: false, text: "Logo aux bonnes dimensions, non affiché tant que l’accord de l’organisateur n’est pas coché." };
  return { shown: true, text: "Logo affiché sur le site." };
}

export function EventForm({ event }: { event?: EventRow }) {
  const status = event ? logoStatus(event) : null;
  return (
    <div className="grid2">
      <section className="clay panel">
        <ActionForm action={saveEventAction.bind(null, event?.id ?? null)} className="stack" style={{ gap: 14 }}>
          <div className="fgrid">
            <label className="field">Nom<input className="input" name="name" required defaultValue={event?.name} /></label>
            <label className="field">
              Type
              <select className="input" name="kind" defaultValue={event?.kind ?? "salon"}>
                <option value="salon">Salon professionnel</option>
                <option value="foire">Foire grand public</option>
              </select>
            </label>
            <label className="field">Ville<input className="input" name="city" required defaultValue={event?.city} /></label>
            <label className="field">Lieu (facultatif)<input className="input" name="venue" defaultValue={event?.venue ?? ""} /></label>
            <label className="field">Ouverture<input className="input" type="date" name="startsOn" required defaultValue={event?.startsOn} /></label>
            <label className="field">Fermeture<input className="input" type="date" name="endsOn" required defaultValue={event?.endsOn} /></label>
            <label className="field">Montage (veille, facultatif)<input className="input" type="date" name="setupOn" defaultValue={event?.setupOn ?? ""} /></label>
            <label className="field">Secteur affiché<input className="input" name="sector" required defaultValue={event?.sector} placeholder="Hôtellerie et restauration" /></label>
            <label className="field">
              Spécialité pour le matching
              <select className="input" name="specialty" defaultValue={event?.specialty ?? ""}>
                <option value="">Aucune</option>
                {SPECIALTIES.map((sp) => (
                  <option key={sp}>{sp}</option>
                ))}
              </select>
            </label>
            <label className="field">Site officiel<input className="input" type="url" name="siteUrl" defaultValue={event?.siteUrl ?? ""} /></label>
            <label className="field">Couleur de pastille<input className="input" type="color" name="color" defaultValue={event?.color ?? "#FFCD4A"} style={{ padding: 6 }} /></label>
          </div>
          <label className="check"><input type="checkbox" name="published" defaultChecked={event?.published ?? true} />Publié (visible sur l’accueil et dans la réservation)</label>
          <label className="check"><input type="checkbox" name="verified" defaultChecked={Boolean(event?.verifiedOn)} />Dates vérifiées sur le site de l’organisateur</label>
          <Submit className="clay btn sm">{event ? "Enregistrer" : "Créer le salon"}</Submit>
          <h3 className="stitle" style={{ marginTop: 10 }}>Logo</h3>
          <p className="muted small">
            Les logos sont des marques de leurs organisateurs : affichez-les uniquement avec leur accord. Format attendu : au moins
            {` ${LOGO_RULES.minWidth} × ${LOGO_RULES.minHeight} px`} (SVG accepté sans minimum), du carré au bandeau 5 fois plus large que haut, de
            préférence sur fond transparent ou blanc. Sinon, ou sans accord, le nom du salon s’affiche sur la couleur choisie.
          </p>
          <label className="field">Fichier (PNG, JPG, WebP ou SVG)<input className="input" type="file" name="logo" accept=".png,.jpg,.jpeg,.webp,.svg" /></label>
          <label className="check"><input type="checkbox" name="logoAuthorized" defaultChecked={event?.logoAuthorized ?? false} />Accord de l’organisateur obtenu : afficher le logo</label>
        </ActionForm>
      </section>
      {event && (
        <section className="clay panel" style={{ alignSelf: "start" }}>
          <h2>Aperçu sur le site</h2>
          <EventArt logoUrl={status?.shown ? fileUrl(event.logoPath) : null} name={event.name} color={event.color} ratio="26/10" />
        </section>
      )}
      {event?.logoPath && (
        <section className="clay panel" style={{ alignSelf: "start" }}>
          <h2>Logo déposé</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fileUrl(event.logoPath)!} alt={`Logo ${event.name}`} style={{ maxWidth: 240, maxHeight: 120, objectFit: "contain", background: "#fff", borderRadius: 12, padding: 10 }} />
          <p className={`note${status?.shown ? " ok" : ""}`}>{status?.text}</p>
          <ActionForm action={removeLogoAction.bind(null, event.id)}>
            <Submit className="clay s btn xs danger">Retirer le logo</Submit>
          </ActionForm>
        </section>
      )}
    </div>
  );
}
