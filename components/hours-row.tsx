import { validateHours } from "@/app/entreprise/actions";
import { ActionForm, Submit } from "./action-form";
import { Avatar } from "./ui";
import { company } from "@/lib/i18n/messages/company";
import { domainLabels } from "@/lib/i18n/messages/domain";
import { getFmt, getMessages } from "@/lib/i18n/server";

export async function HoursRow({
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
  const t = (await getMessages(company)).hours;
  const f = await getFmt();
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
            {domainLabels(f.lang).role(a.role).short}
            {a.hasDeclared ? t.declared(f.hoursLabel(a.declared)) : t.planned}
          </span>
        </span>
      </div>
      {a.validated ? (
        <span className="st ok">{t.validated(f.hoursLabel(a.retained))}</span>
      ) : a.pending === "ajuste" ? (
        <span className="st warn">{t.adjusted(f.hoursLabel(a.retained))}</span>
      ) : a.pending === "conteste" ? (
        <span className="st warn">{t.disputed}</span>
      ) : (
        <ActionForm action={validateHours.bind(null, a.id)} className="inline" style={{ gap: 8 }}>
          <label className="sr-only" htmlFor={`h-${a.id}`}>
            {t.hoursOf(a.firstName)}
          </label>
          <input
            id={`h-${a.id}`}
            className="input"
            name="hours"
            defaultValue={(a.declared / 60).toLocaleString(f.locale)}
            style={{ width: 90, minHeight: 40, padding: "8px 12px", fontWeight: 800 }}
            inputMode="decimal"
          />
          <span className="muted small">h</span>
          <label className="sr-only" htmlFor={`n-${a.id}`}>
            {t.reasonFor(a.firstName)}
          </label>
          <input
            id={`n-${a.id}`}
            className="input"
            name="note"
            placeholder={t.reason}
            maxLength={500}
            style={{ width: 210, minHeight: 40, padding: "8px 12px" }}
          />
          <Submit className="clay s btn xs ok" pending="…">
            {t.validate}
          </Submit>
        </ActionForm>
      )}
    </div>
  );
}
