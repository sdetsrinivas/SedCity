import data from "../data/news.json";
import { call } from "../api";

type Text = { en: string; ta: string };
export type NewsCategory = "works" | "health" | "culture" | "environment" | "education" | "sports";

interface BaseItem {
  slug: string;
  category: NewsCategory;
  /** Publication date (ISO). */
  date: string;
  title: Text;
  summary: Text;
}
export interface ArticleItem extends BaseItem {
  kind: "news";
  more: Text;
}
export interface EventItem extends BaseItem {
  kind: "event";
  eventDate: string;
  time: string;
  venue: Text;
  organiser: Text;
  capacity: number;
  registered: number;
  body: { en: string[]; ta: string[] };
}
export type NewsItem = ArticleItem | EventItem;

export const NEWS_ITEMS = data.items as NewsItem[];
export const NEWS_CATEGORIES = data.categories as NewsCategory[];
export const NEWS_PAGE_SIZE = data.pageSize;

export const isEvent = (n: NewsItem): n is EventItem => n.kind === "event";
export const eventBySlug = (slug: string): EventItem | undefined => NEWS_ITEMS.filter(isEvent).find((e) => e.slug === slug);

export interface NewsFilter {
  eventsOnly: boolean;
  /** "" = all categories. */
  category: string;
}

export interface NewsPage {
  items: NewsItem[];
  page: number;
  total: number;
  hasMore: boolean;
}

/** Pure paging over the seeded items, newest first (the JSON is already in that order). */
export function queryNews(filter: NewsFilter, page: number, items: NewsItem[] = NEWS_ITEMS, size = NEWS_PAGE_SIZE): NewsPage {
  const matching = items.filter((n) => (!filter.eventsOnly || n.kind === "event") && (!filter.category || n.category === filter.category));
  const start = page * size;
  return { items: matching.slice(start, start + size), page, total: matching.length, hasMore: start + size < matching.length };
}

/** One page of the news list (NEWS_PAGE, random 1–4s). The server renders page 0 itself without a delay. */
export const fetchNewsPage = (filter: NewsFilter, page: number) => call("NEWS_PAGE", () => queryNews(filter, page));

// ── Event registration ────────────────────────────────────────────

export interface SeatInfo {
  capacity: number;
  left: number;
}

/** Seats left = capacity − seeded registrations − registrations made in this browser. */
export function seatsLeft(event: EventItem, ownAttendees: number): SeatInfo {
  return { capacity: event.capacity, left: Math.max(0, event.capacity - event.registered - ownAttendees) };
}

export const checkSeats = (event: EventItem, ownAttendees: number) => call("EVENT_SEATS", () => seatsLeft(event, ownAttendees));

export const submitEventRegistration = (event: EventItem, attendees: number, ownAttendees: number) =>
  call("EVENT_REGISTER", () => ({ accepted: attendees <= seatsLeft(event, ownAttendees).left }));
