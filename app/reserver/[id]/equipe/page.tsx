import { redirect } from "next/navigation";
import { getLang } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
import { Stepper } from "@/components/booking";
import { booking } from "@/lib/i18n/messages/booking";
import { getMessages } from "@/lib/i18n/server";
import { PageHead } from "@/components/ui";
import { isRoleKey, type OutfitKey, type RoleKey } from "@/lib/domain";
import { billableMinutesPerDay } from "@/lib/pricing";
import { saveTeam } from "../../actions";
import { loadDraft, reachedStep } from "../data";
import { TeamForm } from "./team-form";

export async function generateMetadata() {
  return { title: (await getMessages(booking)).meta.team };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await loadDraft(id, "equipe");
  if (!d.event) redirect(localizePath(`/reserver/${id}/evenement`, await getLang()));
  const initialQty: Partial<Record<RoleKey, number>> = {};
  for (const p of d.positions) if (isRoleKey(p.role)) initialQty[p.role] = p.qty;
  const selectedRates: Partial<Record<RoleKey, number[]>> = {};
  for (const a of d.assignments) if (isRoleKey(a.role)) (selectedRates[a.role] ??= []).push(a.hourlyRateCents);

  const m = await getMessages(booking);
  return (
    <>
      <PageHead label={m.head.label} title={m.head.title}>
        {m.head.lead}
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
