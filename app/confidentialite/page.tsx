import { DocPage } from "@/components/doc-page";
import { CONFIDENTIALITE } from "@/lib/content/legal";

export const metadata = { title: "Politique de confidentialité" };

export default function Page() {
  return (
    <DocPage
      title="Politique de confidentialité"
      intro="Protection des données personnelles, conformément au RGPD et à la loi Informatique et Libertés. Dernière mise à jour : [date]"
      sections={CONFIDENTIALITE}
    />
  );
}
