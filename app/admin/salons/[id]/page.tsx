import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb, schema as s } from "@/db";
import { BackLink, PageHead } from "@/components/ui";
import { EventForm } from "../event-form";

export const metadata = { title: "Modifier un salon" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  const { id } = await params;
  const { ok } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [event] = await (await getDb()).select().from(s.events).where(eq(s.events.id, id));
  if (!event) notFound();
  return (
    <>
      <BackLink href="/admin/salons">Salons et foires</BackLink>
      {ok && <p className="note ok">Enregistré.</p>}
      <PageHead label="Administration" title={event.name} />
      <EventForm event={event} />
    </>
  );
}
