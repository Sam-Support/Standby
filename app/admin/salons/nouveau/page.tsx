import { BackLink, PageHead } from "@/components/ui";
import { EventForm } from "../event-form";
import { requireAdmin } from "@/lib/auth/session";

export const metadata = { title: "Nouveau salon" };

export default async function Page() {
  await requireAdmin(); // le layout ne suffit pas : une navigation côté client ne le réexécute pas
  return (
    <>
      <BackLink href="/admin/salons">Salons et foires</BackLink>
      <PageHead label="Administration" title="Nouveau salon ou foire" />
      <EventForm />
    </>
  );
}
