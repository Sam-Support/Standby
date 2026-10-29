import { DocPage } from "@/components/doc-page";
import { legalContent } from "@/lib/content";
import { pages } from "@/lib/i18n/messages/pages";
import { getLang, getMessages } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: (await getMessages(pages)).docs.cgu };
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
      title={t.cgu}
      intro={t.updated}
      sections={legalContent(lang).CGU}
    />
  );
}
