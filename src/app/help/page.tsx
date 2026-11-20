import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { PageHead } from "@/components/PageHead";
import { HelpTabs } from "@/modules/help/HelpTabs";
import { FaqAccordion } from "@/modules/help/FaqAccordion";
import { faqGroups } from "@/modules/help/faq";
import { FeeSchedule } from "@/modules/help/FeeSchedule";
import { ContactPanel } from "@/modules/help/ContactPanel";
import { HelpChat } from "@/modules/help/HelpChat";
import s from "@/modules/help/Help.module.css";

export const metadata: Metadata = { title: "Help Centre" };

export default async function HelpPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { t } = await getT();
  const { tab } = await searchParams;
  return (
    <>
      <PageHead title={t("help.title")} intro={t("help.intro")} />
      <div className="container">
        <div className={`page ${s.layout}`}>
          <div className={`card ${s.main}`}>
            <HelpTabs
              label={t("help.tabs")}
              initial={tab ?? "faq"}
              tabs={[
                { id: "faq", label: t("help.tab.faq") },
                { id: "fees", label: t("help.tab.fees") },
                { id: "contact", label: t("help.tab.contact") },
              ]}
            >
              <FaqAccordion groups={faqGroups(t)} />
              <FeeSchedule />
              <ContactPanel />
            </HelpTabs>
          </div>
          <aside className={s.side} aria-label={t("help.chat.region")}>
            <p className={s.sideIntro}>{t("help.chat.intro")}</p>
            <HelpChat />
          </aside>
        </div>
      </div>
    </>
  );
}
