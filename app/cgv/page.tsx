import { getDb } from "@/db";
import { DocPage } from "@/components/doc-page";
import { cgv } from "@/lib/content/legal";
import { percent } from "@/lib/format";
import { getPricing } from "@/lib/settings";

export const metadata = { title: "Conditions générales de vente" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const pricing = await getPricing(await getDb());
  return (
    <DocPage
      title="Conditions générales de vente"
      intro="Applicables aux entreprises exposantes. Dernière mise à jour : [date]"
      sections={cgv(percent(pricing.serviceFeeBps))}
    />
  );
}
