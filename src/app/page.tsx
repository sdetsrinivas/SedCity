import Link from "next/link";
import { Suspense } from "react";
import { getT } from "@/i18n/server";
import { TickerHost } from "@/modules/home/TickerHost";
import { Carousel } from "@/modules/home/Carousel";
import { GlobalSearch } from "@/modules/home/GlobalSearch";
import { QuickTiles } from "@/modules/home/QuickTiles";
import { QuickPayIsland } from "@/modules/home/QuickPayIsland";
import { Notices, NoticesSkeleton } from "@/modules/home/Notices";
import s from "@/modules/home/Home.module.css";

export default async function HomePage() {
  const { t } = await getT();
  return (
    <>
      <TickerHost />
      <div className="container">
        <div className={s.hero}>
          <Carousel />
          <QuickPayIsland />
        </div>
      </div>
      <GlobalSearch />
      <div className="container">
        <QuickTiles />
        <div className={s.cols}>
          <section className="card" aria-labelledby="notices-title">
            <div className="card-title">
              <h2 id="notices-title">{t("home.announcements")}</h2>
              <Link href="/news" className="small">{t("home.viewAll")}</Link>
            </div>
            <Suspense fallback={<NoticesSkeleton label={t("home.loadingNotices")} />}>
              <Notices />
            </Suspense>
          </section>
          <div>
            <section className="card" aria-labelledby="glance-title">
              <div className="card-title"><h2 id="glance-title">{t("home.atAGlance")}</h2></div>
              <div className={`card-body ${s.stats}`}>
                <div className={s.stat}><span className={s.statNum}>48</span><span className={s.statLabel}>{t("home.stat.wards")}</span></div>
                <div className={s.stat}><span className={s.statNum}>6</span><span className={s.statLabel}>{t("home.stat.zones")}</span></div>
                <div className={s.stat}><span className={s.statNum}>14.2 L</span><span className={s.statLabel}>{t("home.stat.population")}</span></div>
                <div className={s.stat}><span className={s.statNum}>36</span><span className={s.statLabel}>{t("home.stat.services")}</span></div>
              </div>
            </section>
            <section className={`card ${s.help}`} aria-labelledby="help-title">
              <div className="card-body">
                <h2 id="help-title">{t("home.helpTitle")}</h2>
                <span className={s.helpline}>155 2026</span>
                <p className="small muted">{t("home.helpBody")}</p>
                <Link href="/help">{t("home.helpLink")}</Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
