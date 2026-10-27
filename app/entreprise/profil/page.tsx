import { eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { ActionForm, Submit } from "@/components/action-form";
import { BackLink, PageHead, RCard } from "@/components/ui";
import { requireCompany } from "@/lib/auth/session";
import { COMPANY_SIZES, HUBSPOT_FIELDS, STANDARD_LEAD_COLUMNS } from "@/lib/domain";
import { formatSiret } from "@/lib/siret";
import { updateIdentity, updateLeadFormat, updateReferents, updateWeb } from "../actions";

export const metadata = { title: "Profil entreprise" };

export default async function Page() {
  const company = await requireCompany("/entreprise/profil");
  const db = await getDb();
  const referents = await db.select().from(s.companyReferents).where(eq(s.companyReferents.companyId, company.id));
  const [template] = await db.select().from(s.leadTemplates).where(eq(s.leadTemplates.companyId, company.id));
  return (
    <>
      <BackLink href="/entreprise">Espace entreprise</BackLink>
      <PageHead label="Espace entreprise" title="Profil entreprise">
        Ces informations sont partagées avec les commerciaux que vous réservez, jamais publiées.
      </PageHead>
      <div className="grid2">
        <section className="clay panel">
          <h2>Société</h2>
          <ActionForm action={updateIdentity} className="stack" style={{ gap: 14 }}>
            <label className="field">Raison sociale<input className="input" name="name" defaultValue={company.name} required /></label>
            <label className="field">SIRET<input className="input" name="siret" defaultValue={formatSiret(company.siret)} required /></label>
            <label className="field">Secteur<input className="input" name="sector" defaultValue={company.sector ?? ""} /></label>
            <label className="field">
              Effectif
              <select className="input" name="size" defaultValue={company.size ?? ""}>
                <option value="">Choisir</option>
                {COMPANY_SIZES.map((sz) => (
                  <option key={sz}>{sz}</option>
                ))}
              </select>
            </label>
            <Submit className="clay s btn sm">Enregistrer</Submit>
          </ActionForm>
        </section>
        <section className="clay panel">
          <h2>Web et plaquette</h2>
          <ActionForm action={updateWeb} className="stack" style={{ gap: 14 }}>
            <label className="field">Site web<input className="input" name="website" defaultValue={company.website ?? ""} /></label>
            <label className="field">Page LinkedIn<input className="input" name="linkedin" defaultValue={company.linkedin ?? ""} /></label>
            <label className="field">
              Nouvelle plaquette (PDF ou PowerPoint){company.brochureName ? ` · actuelle : ${company.brochureName}` : ""}
              <input className="input" type="file" name="brochure" accept=".pdf,.ppt,.pptx" />
            </label>
            <Submit className="clay s btn sm">Enregistrer</Submit>
          </ActionForm>
        </section>
        <section className="clay panel">
          <h2>Référents</h2>
          <ActionForm action={updateReferents} className="stack" style={{ gap: 14 }}>
            {[0, 1, 2].map((i) => (
              <fieldset key={i} className="fgrid" style={{ border: 0, margin: 0, padding: 0 }}>
                <legend className="stitle" style={{ marginBottom: 6 }}>Référent {i + 1}</legend>
                <label className="field">Nom<input className="input" name="ref_name" defaultValue={referents[i]?.name} required={i === 0} /></label>
                <label className="field">Fonction<input className="input" name="ref_title" defaultValue={referents[i]?.title ?? ""} /></label>
                <label className="field">Téléphone<input className="input" name="ref_phone" defaultValue={referents[i]?.phone ?? ""} /></label>
              </fieldset>
            ))}
            <Submit className="clay s btn sm">Enregistrer</Submit>
          </ActionForm>
        </section>
        <section className="clay panel">
          <h2>CRM et leads</h2>
          <ActionForm action={updateLeadFormat} className="stack leadform" style={{ gap: 14 }}>
            <fieldset className="rcards" style={{ border: 0, margin: 0, padding: 0 }}>
              <legend className="sr-only">Format</legend>
              <RCard name="mode" value="excel" checked={company.leadMode === "excel"} title="Template Excel" />
              <RCard name="mode" value="crm" checked={company.leadMode === "crm"} title="CRM (HubSpot)" />
              <RCard name="mode" value="standard" checked={company.leadMode === "standard"} title="Fiche standard" />
            </fieldset>
            <div className="when when-excel stack">
              <label className="field">Template Excel (.xlsx)<input className="input" type="file" name="template" accept=".xlsx" /></label>
              <label className="field">
                Ou colonnes, une par ligne
                <textarea className="input" name="columns" defaultValue={template?.columns.join("\n")}></textarea>
              </label>
            </div>
            <div className="when when-crm stack">
              <label className="field">
                Email de l’administrateur CRM
                <input className="input" type="email" name="crmAdminEmail" defaultValue={company.crmAdminEmail ?? ""} />
              </label>
              <div className="chips" style={{ gap: 6 }}>
                {HUBSPOT_FIELDS.map((f) => (
                  <span key={f.label} className="colc">{f.label}</span>
                ))}
              </div>
            </div>
            <div className="when when-standard chips" style={{ gap: 6 }}>
              {STANDARD_LEAD_COLUMNS.map((c) => (
                <span key={c} className="colc">{c}</span>
              ))}
            </div>
            <Submit className="clay s btn sm">Enregistrer</Submit>
          </ActionForm>
        </section>
      </div>
    </>
  );
}
