import { redirect } from "next/navigation";
import { Stepper } from "@/components/booking";
import { PageHead } from "@/components/ui";
import { isRoleKey, type OutfitKey, type RoleKey } from "@/lib/domain";
import { billableMinutesPerDay } from "@/lib/pricing";
import { saveTeam } from "../../actions";
import { loadDraft, reachedStep } from "../data";
import { TeamForm } from "./team-form";

export const metadata = { title: "Réserver · Équipe" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await loadDraft(id, "equipe");
  if (!d.event) redirect(`/reserver/${id}/evenement`);
  const initialQty: Partial<Record<RoleKey, number>> = {};
  for (const p of d.positions) if (isRoleKey(p.role)) initialQty[p.role] = p.qty;
  const selectedRates: Partial<Record<RoleKey, number[]>> = {};
  for (const a of d.assignments) if (isRoleKey(a.role)) (selectedRates[a.role] ??= []).push(a.hourlyRateCents);

  return (
    <>
      <PageHead label="Réservation exposant" title="Réserver une équipe de stand">
        Cinq étapes. L’estimation se met à jour à chaque choix, le total définitif apparaît au récapitulatif.
      </PageHead>
      <Stepper id={id} current={2} reached={reachedStep(d)} />
      <TeamForm
        id={id}
        action={saveTeam.bind(null, id)}
        kind={d.event.kind}
        initialQty={initialQty}
        initialLanguages={d.booking.languages}
        initialOutfit={d.booking.outfit as OutfitKey}
        floors={d.pricing.floors}
        selectedRates={selectedRates}
        serviceFeeBps={d.pricing.serviceFeeBps}
        vatBps={d.pricing.vatBps}
        outfitSurchargeCents={d.pricing.outfitStandbyCents}
        aside={{
          event: d.event,
          stand: d.booking.stand,
          days: d.booking.days.length,
          minutesPerDay: billableMinutesPerDay(d.booking.startTime, d.booking.endTime),
          startTime: d.booking.startTime,
          endTime: d.booking.endTime,
        }}
      />
    </>
  );
}
