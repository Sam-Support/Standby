import Link from "@/components/link";
import { legalContent } from "@/lib/content";
import { pages } from "@/lib/i18n/messages/pages";
import { getLang, getMessages } from "@/lib/i18n/server";
import { FaqSearch } from "./search";

export async function generateMetadata() {
  return { title: (await getMessages(pages)).faq.title };
}

export default async function Page() {
  const all = await getMessages(pages);
  const t = all.faq;
  return (
    <>
      <div className="head">
        <div>
          <span className="lab">{all.help}</span>
          <h1>{t.title}</h1>
          <p>
            {t.leadBefore}
            <Link href="/contact">{t.write}</Link>.
          </p>
        </div>
      </div>
      <FaqSearch faq={legalContent(await getLang()).FAQ} />
    </>
  );
}
