import { DocPage } from "@/components/doc-page";
import { MENTIONS } from "@/lib/content/legal";

export const metadata = { title: "Mentions légales" };

export default function Page() {
  return <DocPage title="Mentions légales" intro="Dernière mise à jour : [date]" sections={MENTIONS} />;
}
