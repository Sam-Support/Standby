import { getDb } from "@/db";
import { DocPage } from "@/components/doc-page";
import { cancellationSchedule } from "@/lib/cancellation";
import { cgv } from "@/lib/content/legal";
import { percent } from "@/lib/format";
import { getPricing } from "@/lib/settings";

export const metadata = { title: "Conditions générales de vente" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const pricing = await getPricing(await getDb());
  const schedule = cancellationSchedule(pricing.cancellation).map((r) => `${r.when} : ${r.bps === 0 ? "sans frais" : percent(r.bps)}`);
  return (
    <DocPage
      title="Conditions générales de vente"
      intro="Applicables aux entreprises exposantes. Dernière mise à jour : [date]"
      sections={cgv(percent(pricing.serviceFeeBps), schedule)}
    />
  );
}
