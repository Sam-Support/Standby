import { ActionForm, Submit } from "@/components/action-form";
import { Avatar } from "@/components/ui";
import { reviewAction } from "../../actions";

type Person = { id: string; firstName: string; lastName: string; avatarColor: string };

export function ReviewForm({ a, given }: { a: Person; given?: { rating: number; comment: string | null } }) {
  const name = `${a.firstName} ${a.lastName}`;
  return (
    <div className="brow" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Avatar first={a.firstName} last={a.lastName} color={a.avatarColor} />
        <b>{name}</b>
        {given && (
          <span className="st ok" aria-label={`Note donnée : ${given.rating} sur 5`}>
            {"★".repeat(given.rating)}
            {"☆".repeat(5 - given.rating)}
          </span>
        )}
      </div>
      {given ? (
        given.comment && <p className="muted small">« {given.comment} »</p>
      ) : (
        <ActionForm action={reviewAction.bind(null, a.id)} className="stack">
          <fieldset className="chips" style={{ border: 0, margin: 0, padding: 0, gap: 6 }}>
            <legend className="sr-only">Note de {name}, de 1 à 5</legend>
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="clay s chip" style={{ padding: "9px 12px" }}>
                <input type="radio" name="rating" value={n} required />
                <span aria-hidden="true">{"★".repeat(n)}</span>
                <span className="sr-only">{n} sur 5</span>
              </label>
            ))}
          </fieldset>
          <label className="field">
            Commentaire (facultatif, visible du commercial)
            <textarea className="input" name="comment" maxLength={1000} style={{ minHeight: 64 }}></textarea>
          </label>
          <div>
            <Submit className="clay s btn xs" pending="Envoi…">
              Publier l’avis
            </Submit>
          </div>
        </ActionForm>
      )}
    </div>
  );
}
