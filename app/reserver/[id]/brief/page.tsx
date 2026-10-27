import Link from "next/link";
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

export const metadata = { title: "Réserver · Brief" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await loadDraft(id, "brief");
  if (!d.event) redirect(`/reserver/${id}/evenement`);
  if (d.positions.length === 0) redirect(`/reserver/${id}/equipe`);
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

  return (
    <>
      <PageHead label="Réservation exposant" title="Réserver une équipe de stand">
        Cinq étapes. L’estimation se met à jour à chaque choix, le total définitif apparaît au récapitulatif.
      </PageHead>
      <Stepper id={id} current={3} reached={reachedStep(d)} />
      <div className="layout">
        <section className="clay main">
          <ActionForm action={saveBrief.bind(null, id)} className="stack leadform" style={{ gap: 18 }}>
            <h2 className="ptitle">Référent sur place</h2>
            <p className="muted small">La personne que les commerciaux appellent à leur arrivée et en cas d’imprévu.</p>
            <fieldset className="rcards" style={{ border: 0, margin: 0, padding: 0 }}>
              <legend className="sr-only">Référent</legend>
              {referents.map((r) => (
                <RCard key={r.id} name="referent" value={r.id} checked={currentRef === r.id} title={r.name}>
                  {[r.title, r.phone].filter(Boolean).join(" · ")}
                </RCard>
              ))}
              <RCard name="referent" value="autre" checked={currentRef === "autre" || referents.length === 0} title="Autre contact">
                Pour cet événement uniquement
              </RCard>
            </fieldset>
            <div className="when when-other fgrid">
              <label className="field">
                Nom du référent
                <input className="input" name="otherName" defaultValue={d.booking.referentOtherName ?? ""} />
              </label>
              <label className="field">
                Téléphone
                <input className="input" name="otherPhone" type="tel" defaultValue={d.booking.referentOtherPhone ?? ""} />
              </label>
            </div>

            <h2 className="ptitle">Supports pour l’équipe</h2>
            <div className="inline">
              {d.company.brochureName && <FileLink href={fileUrl(d.company.brochurePath)} name={d.company.brochureName} hint="depuis votre compte" />}
              {d.booking.brochureName && <FileLink href={fileUrl(d.booking.brochurePath)} name={d.booking.brochureName} hint="pour cet événement" />}
            </div>
            <div className="sunk drop">
              <span className="clay s ic" aria-hidden="true"></span>
              <div>
                <label htmlFor="brochure">
                  <b>Joindre une version spécifique à cet événement</b>
                </label>
                <p className="muted small">PDF ou PowerPoint, 20 Mo maximum. Transmise aux commerciaux avant le briefing J-2.</p>
              </div>
              <input id="brochure" className="input" type="file" name="brochure" accept=".pdf,.ppt,.pptx" style={{ maxWidth: 280 }} />
            </div>
            <label className="field">
              Produits ou offres à mettre en avant
              <input className="input" name="highlights" defaultValue={d.booking.highlights ?? ""} placeholder="Ex. : nouvelle gamme LED, offre salon -15 %, démo du configurateur" />
            </label>
            <label className="field">
              Brief pour l’équipe
              <textarea
                className="input"
                name="brief"
                defaultValue={d.booking.brief ?? ""}
                placeholder="Ex. : accueil des visiteurs, qualification des leads sur tablette, prise de rendez-vous avec l’équipe technique…"
              ></textarea>
            </label>

            <h2 className="ptitle">Remontée des leads</h2>
            {crm ? (
              <p className="note info">Les leads seront créés directement dans {d.company.crmProvider ?? "votre CRM"}. Modifiable dans votre profil entreprise.</p>
            ) : (
              <fieldset className="rcards" style={{ border: 0, margin: 0, padding: 0 }}>
                <legend className="sr-only">Format des leads</legend>
                {templates.map((t) => (
                  <RCard key={t.id} name="template" value={t.id} checked={currentTpl === t.id} title={t.name}>
                    {t.columns.length} colonnes{t.companyId ? " · défini dans votre compte" : ", export Excel"}
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
              <legend className="sr-only">Fréquence de remontée</legend>
              <SegOption name="frequency" value="quotidien" checked={d.booking.leadFrequency === "quotidien"}>Fin de chaque journée</SegOption>
              <SegOption name="frequency" value="fin" checked={d.booking.leadFrequency === "fin"}>Fin de l’événement</SegOption>
            </fieldset>
            <div className="nav-row">
              <Link className="clay btn ghost" href={`/reserver/${id}/equipe`}>
                Retour
              </Link>
              <Submit pending="Matching en cours…">Lancer le matching</Submit>
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
