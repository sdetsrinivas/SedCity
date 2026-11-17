"use client";
import { useState } from "react";
import { useT } from "@/i18n/client";
import { pick } from "@/i18n";
import { Icon } from "@/components/ui/Icon";
import { formatDate } from "@/lib/format";
import type { NewsItem } from "@/mock/endpoints/news";
import { LazyImage } from "./LazyImage";
import { categoryKey } from "./NewsCategorySelect";
import s from "./News.module.css";

/**
 * BTN-03: every card ends in a control whose only text is "Read more" — a button that expands a news
 * item in place, or (DLG-14) a link that opens an event's page in a new tab. Nothing in their names
 * says which card they belong to; the card (`article`, named by its heading) does.
 */
export function NewsCard({ item }: { item: NewsItem }) {
  const { t, lang } = useT();
  const [expanded, setExpanded] = useState(false);
  const headingId = `news-${item.slug}`;
  const moreId = `news-${item.slug}-more`;

  return (
    <article className={`card ${s.card}`} aria-labelledby={headingId}>
      <LazyImage src={`/images/news/${item.category}.svg`} alt="" />
      <div className={s.cardBody}>
        <p className={s.meta}>
          <span className={`badge ${s[`cat_${item.category}`]}`}>{t(categoryKey(item.category))}</span>
          {item.kind === "event" && <span className={`badge ${s.eventBadge}`}>{t("news.event")}</span>}
          <time dateTime={item.date} className="small muted">{formatDate(item.date)}</time>
        </p>
        <h3 id={headingId} className={s.cardTitle}>{pick(item.title, lang)}</h3>
        {item.kind === "event" && (
          <p className={s.when}>
            <Icon name="calendar" size={16} />
            <span>{formatDate(item.eventDate)} · {item.time} · {pick(item.venue, lang)}</span>
          </p>
        )}
        <p className={s.summary}>{pick(item.summary, lang)}</p>
        {item.kind === "news" && <p id={moreId} className={s.summary} hidden={!expanded}>{pick(item.more, lang)}</p>}
        <div className={s.cardFoot}>
          {item.kind === "event" ? (
            // DLG-14: the event page opens in a new tab (no opener, no referrer).
            <a href={`/news/events/${item.slug}`} target="_blank" rel="noopener noreferrer" className={s.more}>
              {t("news.readMore")}
              <Icon name="external" size={14} />
            </a>
          ) : (
            <button type="button" className={s.more} aria-expanded={expanded} aria-controls={moreId} onClick={() => setExpanded((v) => !v)}>
              {t(expanded ? "news.showLess" : "news.readMore")}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
