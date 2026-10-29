import Link from "@/components/link";
import { getLang, getMessages } from "@/lib/i18n/server";
import { booking } from "@/lib/i18n/messages/booking";
import { localizePath } from "@/lib/i18n/config";
import { eq, isNull, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { schema as s } from "@/db";
import { ActionForm, Submit } from "@/components/action-form";
import { BookingAside, Stepper } from "@/components/booking";
import { FileLink, PageHead, RCard, SegOption } from "@/components/ui";
import { HUBSPOT_FIELDS } from "@/lib/domain";
import { billableMinutesPerDay } from "@/lib/pricing";
import { fileUrl } from "@/lib/storage";
import { saveBrief } from "../../actions";
import { loadDraft, reachedStep } from "../data";

export async function generateMetadata() {
  return { title: (await getMessages(booking)).meta.brief };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await loadDraft(id, "brief");
  if (!d.event) redirect(localizePath(`/reserver/${id}/evenement`, await getLang()));
  if (d.positions.length === 0) redirect(localizePath(`/reserver/${id}/equipe`, await getLang()));
  const referents = await d.db.select().from(s.companyReferents).where(eq(s.companyReferents.companyId, d.company.id));
  const templates = await d.db
    .select()
    .from(s.leadTemplates)
    .where(or(eq(s.leadTemplates.companyId, d.company.id), isNull(s.leadTemplates.companyId)));
  templates.sort((a, b) => (a.companyId ? -1 : 0) - (b.companyId ? -1 : 0));
  const crm = d.company.leadMode === "crm";
  const currentRef = d.booking.referentId ?? (d.booking.referentOtherName ? "autre" : referents[0]?.id);
  const currentTpl = d.booking.leadTemplateId ?? templates[0]?.id;
  const shownColumns = crm ? HUBSPOT_FIELDS.map((f) => f.label) : (templates.find((t) => t.id === currentTpl)?.columns ?? []);

  const m = await getMessages(booking);
  const t = m.brief;
  return (
    <>
      <PageHead label={m.head.label} title={m.head.title}>
        {m.head.lead}
      </PageHead>
      <Stepper id={id} current={3} reached={reachedStep(d)} />
      <div className="layout">
        <section className="clay main">
          <ActionForm action={saveBrief.bind(null, id)} className="stack leadform" style={{ gap: 18 }}>
            <h2 className="ptitle">{t.referent}</h2>
            <p className="muted small">{t.referentHint}</p>
            <fieldset className="rcards" style={{ border: 0, margin: 0, padding: 0 }}>
              <legend className="sr-only">{t.referentLegend}</legend>
              {referents.map((r) => (
                <RCard key={r.id} name="referent" value={r.id} checked={currentRef === r.id} title={r.name}>
                  {[r.title, r.phone].filter(Boolean).join(" · ")}
                </RCard>
              ))}
              <RCard name="referent" value="autre" checked={currentRef === "autre" || referents.length === 0} title={t.other}>
                {t.otherHint}
              </RCard>
            </fieldset>
            <div className="when when-other fgrid">
              <label className="field">
                {t.otherName}
                <input className="input" name="otherName" defaultValue={d.booking.referentOtherName ?? ""} />
              </label>
              <label className="field">
                {t.phone}
                <input className="input" name="otherPhone" type="tel" defaultValue={d.booking.referentOtherPhone ?? ""} />
              </label>
            </div>

            <h2 className="ptitle">{t.supports}</h2>
            <div className="inline">
              {d.company.brochureName && <FileLink href={fileUrl(d.company.brochurePath)} name={d.company.brochureName} hint={t.fromAccount} />}
              {d.booking.brochureName && <FileLink href={fileUrl(d.booking.brochurePath)} name={d.booking.brochureName} hint={t.forEvent} />}
            </div>
            <div className="sunk drop">
              <span className="clay s ic" aria-hidden="true"></span>
              <div>
                <label htmlFor="brochure">
                  <b>{t.attach}</b>
                </label>
                <p className="muted small">{t.attachHint}</p>
              </div>
              <input id="brochure" className="input" type="file" name="brochure" accept=".pdf,.ppt,.pptx" style={{ maxWidth: 280 }} />
            </div>
            <label className="field">
              {t.highlights}
              <input className="input" name="highlights" defaultValue={d.booking.highlights ?? ""} placeholder={t.highlightsPlaceholder} />
            </label>
            <label className="field">
              {t.brief}
              <textarea
                className="input"
                name="brief"
                defaultValue={d.booking.brief ?? ""}
                placeholder={t.briefPlaceholder}
              ></textarea>
            </label>

            <h2 className="ptitle">{t.leads}</h2>
            {crm ? (
              <p className="note info">{t.crm(d.company.crmProvider)}</p>
            ) : (
              <fieldset className="rcards" style={{ border: 0, margin: 0, padding: 0 }}>
                <legend className="sr-only">{t.format}</legend>
                {templates.map((tpl) => (
                  <RCard key={tpl.id} name="template" value={tpl.id} checked={currentTpl === tpl.id} title={tpl.companyId ? tpl.name : m.leadFormats.standard}>
                    {t.columns(tpl.columns.length, Boolean(tpl.companyId))}
                  </RCard>
                ))}
              </fieldset>
            )}
            <div className="chips" style={{ gap: 6 }}>
              {shownColumns.map((c) => (
                <span key={c} className="colc">{c}</span>
              ))}
            </div>
            <fieldset className="seg sunk" style={{ border: 0, margin: 0 }}>
              <legend className="sr-only">{t.frequency}</legend>
              <SegOption name="frequency" value="quotidien" checked={d.booking.leadFrequency === "quotidien"}>{t.daily}</SegOption>
              <SegOption name="frequency" value="fin" checked={d.booking.leadFrequency === "fin"}>{t.end}</SegOption>
            </fieldset>
            <div className="nav-row">
              <Link className="clay btn ghost" href={`/reserver/${id}/equipe`}>
                {m.back}
              </Link>
              <Submit pending={t.pending}>{t.next}</Submit>
            </div>
          </ActionForm>
        </section>
        <BookingAside
          event={d.event}
          stand={d.booking.stand}
          days={d.booking.days.length}
          minutesPerDay={billableMinutesPerDay(d.booking.startTime, d.booking.endTime)}
          startTime={d.booking.startTime}
          endTime={d.booking.endTime}
          people={d.quote.people}
          companyName={d.company.name}
          quote={d.quote}
        />
      </div>
    </>
  );
}
