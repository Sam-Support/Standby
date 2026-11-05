import { DocPage } from "@/components/doc-page";
import { legalContent } from "@/lib/content";
import { pages } from "@/lib/i18n/messages/pages";
import { getLang, getMessages } from "@/lib/i18n/server";
import { getDb } from "@/db";
import { cancellationSchedule } from "@/lib/cancellation";
import { fmt } from "@/lib/format";
import { getPricing } from "@/lib/settings";

export async function generateMetadata() {
  return { title: (await getMessages(pages)).docs.cgv.title };
}

export const dynamic = "force-dynamic";

export default async function Page() {
  const lang = await getLang();
  const all = await getMessages(pages);
  const t = all.docs;
  const f = fmt(lang);
  const pricing = await getPricing(await getDb());
  const schedule = cancellationSchedule(pricing.cancellation, lang).map((r) => `${r.when}${lang === "fr" ? " : " : ": "}${r.bps === 0 ? t.cgv.free : f.percent(r.bps)}`);
  return (
    <DocPage
      label={all.legal}
      tocLabel={all.toc}
      notice={all.frenchPrevails}
      title={t.cgv.title}
      intro={t.cgv.intro}
      sections={legalContent(lang).cgv(f.percent(pricing.serviceFeeBps), schedule)}
    />
  );
}
