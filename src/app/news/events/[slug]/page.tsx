import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getT } from "@/i18n/server";
import { pick, type DictKey } from "@/i18n";
import { PageHead } from "@/components/PageHead";
import { Icon } from "@/components/ui/Icon";
import { formatDate } from "@/lib/format";
import { eventBySlug } from "@/mock/endpoints/news";
import { RegisterPanel } from "@/modules/news/RegisterPanel";
import s from "@/modules/news/News.module.css";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const event = eventBySlug((await params).slug);
  return { title: event ? event.title.en : "News & Events" };
}

export default async function EventPage({ params }: Params) {
  const event = eventBySlug((await params).slug);
  if (!event) notFound();
  const { t, lang } = await getT();
  const title = pick(event.title, lang);
  return (
    <>
      <PageHead title={title} trail={[{ label: t("nav.news"), href: "/news" }]} intro={pick(event.summary, lang)} />
      <div className="container">
        <div className={`page ${s.eventLayout}`}>
          <article className={`card ${s.eventArticle}`} aria-labelledby="ev-about-title">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/images/news/${event.category}.svg`} alt="" width={480} height={270} className={s.eventPicture} />
            <div className="card-body">
              <dl className={s.eventFacts}>
                <div><dt><Icon name="calendar" size={16} /> {t("ev.date")}</dt><dd>{formatDate(event.eventDate)}</dd></div>
                <div><dt><Icon name="clock" size={16} /> {t("ev.time")}</dt><dd>{event.time}</dd></div>
                <div><dt><Icon name="map" size={16} /> {t("ev.venue")}</dt><dd>{pick(event.venue, lang)}</dd></div>
                <div><dt><Icon name="info" size={16} /> {t("ev.organiser")}</dt><dd>{pick(event.organiser, lang)}</dd></div>
              </dl>
              <h2 id="ev-about-title" className={s.aboutTitle}>{t("ev.about")}</h2>
              {pick(event.body, lang).map((p) => <p key={p.slice(0, 32)}>{p}</p>)}
              <p className="small muted">
                <span className={`badge ${s[`cat_${event.category}`]}`}>{t(`news.cat.${event.category}` as DictKey)}</span>{" "}
                {t("ev.published", { date: formatDate(event.date) })}
              </p>
              <Link href="/news" className={s.backLink}><Icon name="chevronLeft" size={16} /> {t("ev.allNews")}</Link>
            </div>
          </article>
          <RegisterPanel slug={event.slug} />
        </div>
      </div>
    </>
  );
}
