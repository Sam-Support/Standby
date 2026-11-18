import { validateHours } from "@/app/entreprise/actions";
import { features } from "@/lib/i18n/messages/features";
import { nameFor, lastInitial } from "@/lib/names";
import { ActionForm, Submit } from "./action-form";
import { Avatar } from "./ui";
import { company } from "@/lib/i18n/messages/company";
import { domainLabels } from "@/lib/i18n/messages/domain";
import { getFmt, getMessages } from "@/lib/i18n/server";

export async function HoursRow({
  a,
  authorized = false,
  commission = null,
}: {
  /** Contact autorisé par Stand-By : nom complet ; sinon prénom et initiale */
  authorized?: boolean;
  /** Commission de l'offre : nombre de leads remontés (proposé par défaut) ou ventes à déclarer */
  commission?: { type: "lead" | "vente"; leads: number } | null;
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
  const x = await getMessages(features);
  const f = await getFmt();
  return (
    <div className="brow">
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Avatar first={a.firstName} last={lastInitial(a.lastName)} color={a.avatarColor} />
        <span>
          <b>{nameFor(a.firstName, a.lastName, authorized)}</b>
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
          {commission?.type === "lead" && (
            <>
              <label className="sr-only" htmlFor={`l-${a.id}`}>
                {x.hours.leadsOf(a.firstName)}
              </label>
              <input id={`l-${a.id}`} className="input" name="qualifiedLeads" inputMode="numeric" defaultValue={commission.leads} style={{ width: 80, minHeight: 40, padding: "8px 12px", fontWeight: 800 }} />
              <span className="muted small">{x.hours.leads}</span>
            </>
          )}
          {commission?.type === "vente" && (
            <>
              <label className="sr-only" htmlFor={`s-${a.id}`}>
                {x.hours.salesOf(a.firstName)}
              </label>
              <input id={`s-${a.id}`} className="input" name="sales" inputMode="decimal" placeholder="0" style={{ width: 110, minHeight: 40, padding: "8px 12px", fontWeight: 800 }} />
              <span className="muted small">{x.hours.sales}</span>
            </>
          )}
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
