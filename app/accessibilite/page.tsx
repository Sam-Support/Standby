import { DocPage } from "@/components/doc-page";
import { ACCESSIBILITE } from "@/lib/content/legal";

export const metadata = { title: "Déclaration d’accessibilité" };

export default function Page() {
  return (
    <DocPage
      title="Déclaration d’accessibilité"
      intro="Établie le [date]. Standby s’engage à rendre son site accessible conformément à l’article 47 de la loi n° 2005-102 du 11 février 2005."
      sections={ACCESSIBILITE}
    />
  );
}
