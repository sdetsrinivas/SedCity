import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { PageHead } from "@/components/PageHead";
import { queryNews } from "@/mock/endpoints/news";
import { NewsFilterProvider } from "@/modules/news/NewsFilterContext";
import { NewsCategorySelect } from "@/modules/news/NewsCategorySelect";
import { EventsOnlyIsland } from "@/modules/news/EventsOnlyIsland";
import { NewsFeed } from "@/modules/news/NewsFeed";
import s from "@/modules/news/News.module.css";

export const metadata: Metadata = { title: "News & Events" };

export default async function NewsPage() {
  const { t } = await getT();
  const first = queryNews({ eventsOnly: false, category: "" }, 0);
  return (
    <>
      <PageHead title={t("nav.news")} intro={t("news.intro")} />
      {/* `.page` resets the side padding of `.container` when both are on one element, so they are nested here. */}
      <div className="container">
        <div className="page">
          <NewsFilterProvider>
            <div className={`card ${s.toolbar}`} role="group" aria-label={t("news.filters")}>
              <NewsCategorySelect />
              <EventsOnlyIsland />
            </div>
            <NewsFeed initial={first} />
          </NewsFilterProvider>
        </div>
      </div>
    </>
  );
}
