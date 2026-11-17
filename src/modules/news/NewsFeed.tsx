"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { fetchNewsPage, type NewsFilter, type NewsPage } from "@/mock/endpoints/news";
import { useNewsFilter } from "./NewsFilterContext";
import { NewsCard } from "./NewsCard";
import s from "./News.module.css";

const MARGIN = 200;
const keyOf = (f: NewsFilter) => `${f.eventsOnly ? 1 : 0}|${f.category}`;

interface FeedState {
  key: string;
  items: NewsPage["items"];
  page: number;
  total: number;
  hasMore: boolean;
}

/**
 * OTH-19: infinite scroll. The server renders the first eight cards; the next eight are fetched
 * (NEWS_PAGE, random 1–4s) when an empty marker after the last card comes within 200px of the viewport.
 * There is no "next page" control. When everything is shown the marker is removed and an end notice
 * appears. A filter change (category or "Show events only") throws the list away and starts again.
 */
export function NewsFeed({ initial }: { initial: NewsPage }) {
  const { t } = useT();
  const [filter] = useNewsFilter();
  const filterKey = keyOf(filter);
  const [feed, setFeed] = useState<FeedState>({ key: keyOf({ eventsOnly: false, category: "" }), ...initial });
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const marker = useRef<HTMLDivElement>(null);
  const request = useRef(0);

  const load = useCallback(
    (f: NewsFilter, page: number) => {
      const id = ++request.current;
      setLoading(true);
      setFailed(false);
      fetchNewsPage(f, page).then(
        (res) => {
          if (id !== request.current) return;
          setFeed((prev) => ({
            key: keyOf(f),
            items: page === 0 ? res.items : [...prev.items, ...res.items],
            page: res.page,
            total: res.total,
            hasMore: res.hasMore,
          }));
          setLoading(false);
        },
        () => {
          if (id !== request.current) return;
          setLoading(false);
          setFailed(true);
        },
      );
    },
    [],
  );

  // A different filter: start again from the first page.
  useEffect(() => {
    if (filterKey === feed.key) return;
    setFeed({ key: filterKey, items: [], page: -1, total: 0, hasMore: true });
    load(filter, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  const loadMore = useCallback(() => {
    if (loading || failed || !feed.hasMore || feed.key !== filterKey) return;
    load(filter, feed.page + 1);
  }, [loading, failed, feed, filter, filterKey, load]);

  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
    // The observer only reports changes: if the marker is still near the viewport after a page has
    // been added (tall screens), keep going.
    const el = marker.current;
    if (el && typeof IntersectionObserver !== "undefined" && el.getBoundingClientRect().top < window.innerHeight + MARGIN) loadMore();
  }, [loadMore]);

  useEffect(() => {
    const el = marker.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMoreRef.current();
      },
      { rootMargin: `0px 0px ${MARGIN}px 0px` },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [feed.hasMore]);

  const reloading = feed.items.length === 0 && loading;

  return (
    <section aria-labelledby="news-list-title" className={s.feed}>
      <div className={s.feedHead}>
        <h2 id="news-list-title" className={s.feedTitle}>{t("news.listTitle")}</h2>
        {!reloading && <p className="small muted">{t("news.count", { shown: feed.items.length, total: feed.total })}</p>}
      </div>

      {reloading ? (
        <div className={s.grid} aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className={`skeleton ${s.skeletonCard}`} />)}
        </div>
      ) : feed.items.length === 0 && !failed && feed.page >= 0 ? (
        <p className={`card ${s.empty}`}>{t("news.empty")}</p>
      ) : (
        <div className={s.grid}>
          {feed.items.map((item) => <NewsCard key={item.slug} item={item} />)}
        </div>
      )}

      {feed.hasMore && <div ref={marker} className={s.marker} aria-hidden="true" />}

      <div role="status" className={s.feedStatus}>
        {loading && (
          <span className={s.loadingMore}>
            <span className={s.spinner} aria-hidden="true" />
            {t(reloading ? "common.loading" : "news.loadingMore")}
          </span>
        )}
        {!loading && !feed.hasMore && feed.items.length > 0 && <span className={s.end}>{t("news.end")}</span>}
      </div>

      {failed && (
        <div className={`alert alert-error ${s.failed}`} role="alert">
          <span>{t("news.loadError")}</span>
          <button type="button" className="btn btn-outline" onClick={() => load(filter, feed.page + 1)}>{t("news.retry")}</button>
        </div>
      )}
    </section>
  );
}
