import { ActionForm } from "@/components/action-form";
import { BookingAside, Stepper } from "@/components/booking";
import { PageHead } from "@/components/ui";
import { billableMinutesPerDay } from "@/lib/pricing";
import { upcomingEvents } from "@/lib/queries";
import { saveEvent } from "../../actions";
import { loadDraft, reachedStep } from "../data";
import { EventPicker } from "./picker";

export const metadata = { title: "Réserver · Événement" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await loadDraft(id, "evenement");
  const events = await upcomingEvents(d.db);
  if (d.event && !events.some((e) => e.id === d.event!.id)) {
    events.unshift(...(await upcomingEvents(d.db, { from: d.event.startsOn })).filter((e) => e.id === d.event!.id));
  }
  return (
    <>
      <PageHead label="Réservation exposant" title="Réserver une équipe de stand">
        Cinq étapes. L’estimation se met à jour à chaque choix, le total définitif apparaît au récapitulatif.
      </PageHead>
      <Stepper id={id} current={1} reached={reachedStep(d)} />
      <div className="layout">
        <section className="clay main">
          <p className="note info">Réservation au nom de {d.company.name}</p>
          <ActionForm action={saveEvent.bind(null, id)} className="stack" style={{ gap: 18 }}>
            <EventPicker
              events={events}
              initial={{
                eventId: d.event?.id ?? null,
                days: d.booking.days,
                startTime: d.booking.startTime,
                endTime: d.booking.endTime,
                stand: d.booking.stand ?? "",
              }}
            />
          </ActionForm>
        </section>
        <BookingAside
          event={d.event}
          stand={d.booking.stand}
          days={d.booking.days.length}
          minutesPerDay={d.event ? billableMinutesPerDay(d.booking.startTime, d.booking.endTime) : 0}
          startTime={d.booking.startTime}
          endTime={d.booking.endTime}
          people={d.quote.people}
          companyName={d.company.name}
          quote={d.positions.length ? d.quote : null}
        />
      </div>
    </>
  );
}
