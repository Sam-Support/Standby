import { DocPage } from "@/components/doc-page";
import { legalContent } from "@/lib/content";
import { pages } from "@/lib/i18n/messages/pages";
import { getLang, getMessages } from "@/lib/i18n/server";
import { BILLING_MANDATE_VERSION } from "@/lib/domain";

export async function generateMetadata() {
  return { title: (await getMessages(pages)).docs.mandate.title };
}

export default async function Page() {
  const lang = await getLang();
  const all = await getMessages(pages);
  const t = all.docs;
  return (
    <DocPage
      label={all.legal}
      tocLabel={all.toc}
      notice={all.frenchPrevails}
      title={t.mandate.title}
      intro={t.mandate.version(BILLING_MANDATE_VERSION)}
      sections={legalContent(lang).MANDAT_FACTURATION}
    />
  );
}
