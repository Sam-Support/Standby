import { DocPage } from "@/components/doc-page";
import { CGU } from "@/lib/content/legal";

export const metadata = { title: "Conditions générales d’utilisation" };

export default function Page() {
  return <DocPage title="Conditions générales d’utilisation" intro="Dernière mise à jour : [date]" sections={CGU} />;
}
