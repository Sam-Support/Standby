import { BackLink, PageHead } from "@/components/ui";
import { EventForm } from "../event-form";

export const metadata = { title: "Nouveau salon" };

export default function Page() {
  return (
    <>
      <BackLink href="/admin/salons">Salons et foires</BackLink>
      <PageHead label="Administration" title="Nouveau salon ou foire" />
      <EventForm />
    </>
  );
}
