import Link from "next/link";
import { getDb } from "@/db";
import { ActionForm, Submit } from "@/components/action-form";
import { PageHead } from "@/components/ui";
import { BOOKING_STATUS_LABELS } from "@/lib/domain";
import { euros, percent } from "@/lib/format";
import { stripeEnabled } from "@/lib/integrations/stripe";
import { hubspotEnabled } from "@/lib/integrations/hubspot";
import { ocrEnabled } from "@/lib/integrations/ocr";
import { supabaseEnabled } from "@/lib/integrations/supabase";
import { dashboardStats } from "@/lib/services/admin";
import { getPricing } from "@/lib/settings";
import { runJobsAction } from "./actions";

export const metadata = { title: "Administration" };

export default async function Page() {
  const db = await getDb();
  const st = await dashboardStats(db);
  const pricing = await getPricing(db);
  const kpi = (label: string, value: string | number, href?: string, warn = false) => {
    const inner = (
      <>
        <span className="lab">{label}</span>
        <b style={warn ? { color: "#8a5200" } : undefined}>{value}</b>
      </>
    );
    return href ? (
      <Link key={label} className="clay kpi" href={href}>
        {inner}
      </Link>
    ) : (
      <div key={label} className="clay kpi">
        {inner}
      </div>
    );
  };
  const services: [string, boolean][] = [
    ["Base et authentification Supabase", supabaseEnabled() || Boolean(process.env.DATABASE_URL)],
    ["Paiements Stripe Connect", stripeEnabled()],
    ["E-mails Resend", Boolean(process.env.RESEND_API_KEY)],
    ["HubSpot", hubspotEnabled()],
    ["Lecture des cartes (Claude)", ocrEnabled()],
  ];

  return (
    <>
      <PageHead
        label="Administration"
        title="Tableau de bord"
        actions={
          <ActionForm action={runJobsAction}>
            <Submit className="clay s btn sm ghost" pending="Exécution…">Lancer les tâches planifiées</Submit>
          </ActionForm>
        }
      >
        Activité de la plateforme, commissions perçues et files de traitement.
      </PageHead>
      <div className="inline" style={{ gap: 18 }}>
        {kpi("CA HT du mois (facturé)", euros(st.monthHt), "/admin/finances")}
        {kpi("Commissions du mois", euros(st.monthFees), "/admin/finances")}
        {kpi("Commissions cumulées", euros(st.totalFees), "/admin/finances")}
        {kpi("Frais de service en vigueur", percent(pricing.serviceFeeBps), "/admin/tarification")}
      </div>
      <div className="inline" style={{ gap: 18 }}>
        {kpi("Profils à vérifier", st.inReview, "/admin/inscrits", st.inReview > 0)}
        {kpi("Cartes à saisir", st.cardsToTranscribe, "/admin/cartes", st.cardsToTranscribe > 0)}
        {kpi("Paiements en échec", st.failedPayments, "/admin/finances", st.failedPayments > 0)}
        {kpi("Messages non traités", st.unreadMessages, "/admin/messages", st.unreadMessages > 0)}
      </div>
      <div className="grid2">
        <section className="clay panel">
          <h2>Réservations par statut</h2>
          {Object.entries(BOOKING_STATUS_LABELS).map(([k, v]) => (
            <div key={k} className="dev">
              <Link href={`/admin/reservations?statut=${k}`}>{v.label} ({k.replace(/_/g, " ")})</Link>
              <b>{st.byStatus[k] ?? 0}</b>
            </div>
          ))}
        </section>
        <section className="clay panel">
          <h2>Plateforme</h2>
          <div className="dev"><span>Entreprises inscrites</span><b>{st.companies}</b></div>
          <div className="dev"><span>Profils validés</span><b>{st.validFreelancers}</b></div>
          <div className="dev"><span>Événements à venir publiés</span><b>{st.upcomingEvents}</b></div>
          <div className="dev"><span>Virements programmés</span><b>{st.pendingPayouts} · {euros(st.pendingPayoutsCents)}</b></div>
          <h3 className="stitle" style={{ marginTop: 8 }}>Services connectés</h3>
          {services.map(([label, on]) => (
            <div key={label} className="dev">
              <span>{label}</span>
              <span className={`st ${on ? "ok" : "warn"}`}>{on ? "configuré" : "mode local / simulé"}</span>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
