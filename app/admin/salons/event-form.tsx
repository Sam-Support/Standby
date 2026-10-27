import { ActionForm, Submit } from "@/components/action-form";
import type { schema } from "@/db";
import { SPECIALTIES } from "@/lib/domain";
import { fileUrl } from "@/lib/storage";
import { removeLogoAction, saveEventAction } from "../actions";

type EventRow = typeof schema.events.$inferSelect;

export function EventForm({ event }: { event?: EventRow }) {
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
            Les logos sont des marques de leurs organisateurs : affichez-les uniquement avec leur accord. Sans autorisation, la pastille de couleur reste
            affichée.
          </p>
          <label className="field">Fichier (PNG, JPG, WebP ou SVG)<input className="input" type="file" name="logo" accept=".png,.jpg,.jpeg,.webp,.svg" /></label>
          <label className="check"><input type="checkbox" name="logoAuthorized" defaultChecked={event?.logoAuthorized ?? false} />Accord de l’organisateur obtenu : afficher le logo</label>
        </ActionForm>
      </section>
      {event?.logoPath && (
        <section className="clay panel" style={{ alignSelf: "start" }}>
          <h2>Logo actuel</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fileUrl(event.logoPath)!} alt={`Logo ${event.name}`} style={{ maxWidth: 240, maxHeight: 120, objectFit: "contain", background: "#fff", borderRadius: 12, padding: 10 }} />
          <p className="small">{event.logoAuthorized ? "Affiché sur le site." : "Non affiché (accord non coché)."}</p>
          <ActionForm action={removeLogoAction.bind(null, event.id)}>
            <Submit className="clay s btn xs danger">Retirer le logo</Submit>
          </ActionForm>
        </section>
      )}
    </div>
  );
}
