import { validateHours } from "@/app/entreprise/actions";
import { ActionForm, Submit } from "./action-form";
import { Avatar } from "./ui";
import { ROLES, type RoleKey } from "@/lib/domain";
import { hoursLabel } from "@/lib/format";

export function HoursRow({
  a,
}: {
  a: {
    id: string;
    firstName: string;
    lastName: string;
    avatarColor: string;
    role: string;
    declared: number;
    retained: number;
    hasDeclared: boolean;
    validated: boolean;
    pending: "ajuste" | "conteste" | null;
  };
}) {
  return (
    <div className="brow">
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Avatar first={a.firstName} last={a.lastName} color={a.avatarColor} />
        <span>
          <b>
            {a.firstName} {a.lastName}
          </b>
          <br />
          <span className="muted small">
            {ROLES[a.role as RoleKey]?.short ?? a.role}
            {a.hasDeclared ? ` · ${hoursLabel(a.declared)} déclarées` : " · heures prévues (rien de déclaré)"}
          </span>
        </span>
      </div>
      {a.validated ? (
        <span className="st ok">{hoursLabel(a.retained)} validées</span>
      ) : a.pending === "ajuste" ? (
        <span className="st warn">{hoursLabel(a.retained)} retenues · réponse du commercial sous 48 h</span>
      ) : a.pending === "conteste" ? (
        <span className="st warn">Contestées · arbitrage de l’équipe Standby</span>
      ) : (
        <ActionForm action={validateHours.bind(null, a.id)} className="inline" style={{ gap: 8 }}>
          <label className="sr-only" htmlFor={`h-${a.id}`}>
            Heures de {a.firstName}
          </label>
          <input
            id={`h-${a.id}`}
            className="input"
            name="hours"
            defaultValue={(a.declared / 60).toLocaleString("fr-FR")}
            style={{ width: 90, minHeight: 40, padding: "8px 12px", fontWeight: 800 }}
            inputMode="decimal"
          />
          <span className="muted small">h</span>
          <label className="sr-only" htmlFor={`n-${a.id}`}>
            Motif si vous retenez moins d’heures pour {a.firstName}
          </label>
          <input
            id={`n-${a.id}`}
            className="input"
            name="note"
            placeholder="Motif si moins d’heures"
            maxLength={500}
            style={{ width: 210, minHeight: 40, padding: "8px 12px" }}
          />
          <Submit className="clay s btn xs ok" pending="…">
            Valider
          </Submit>
        </ActionForm>
      )}
    </div>
  );
}
