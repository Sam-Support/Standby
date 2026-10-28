import { DocPage } from "@/components/doc-page";
import { MANDAT_FACTURATION } from "@/lib/content/legal";
import { BILLING_MANDATE_VERSION } from "@/lib/domain";

export const metadata = { title: "Mandat de facturation" };

export default function Page() {
  return <DocPage title="Mandat de facturation" intro={`Version ${BILLING_MANDATE_VERSION}`} sections={MANDAT_FACTURATION} />;
}
