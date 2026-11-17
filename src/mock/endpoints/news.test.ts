import { describe, expect, it } from "vitest";
import { eventBySlug, isEvent, NEWS_CATEGORIES, NEWS_ITEMS, queryNews, seatsLeft } from "./news";

describe("news mock data", () => {
  it("has 30 items, 11 of them events, with unique slugs, newest first", () => {
    expect(NEWS_ITEMS).toHaveLength(30);
    expect(NEWS_ITEMS.filter(isEvent)).toHaveLength(11);
    expect(new Set(NEWS_ITEMS.map((n) => n.slug)).size).toBe(30);
    const dates = NEWS_ITEMS.map((n) => n.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it("every item has a known category and English + Tamil text", () => {
    for (const n of NEWS_ITEMS) {
      expect(NEWS_CATEGORIES, n.slug).toContain(n.category);
      for (const t of [n.title, n.summary, n.kind === "news" ? n.more : n.venue]) {
        expect(t.en.length, n.slug).toBeGreaterThan(3);
        expect(t.ta.length, n.slug).toBeGreaterThan(3);
      }
      if (isEvent(n)) {
        expect(n.body.en).toHaveLength(n.body.ta.length);
        expect(n.registered).toBeLessThan(n.capacity);
        expect(n.eventDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it("titles are unique (cards are told apart by their heading)", () => {
    expect(new Set(NEWS_ITEMS.map((n) => n.title.en)).size).toBe(30);
  });
});

describe("queryNews", () => {
  it("pages all items eight at a time and reports the end", () => {
    const pages = [0, 1, 2, 3].map((p) => queryNews({ eventsOnly: false, category: "" }, p));
    expect(pages.map((p) => p.items.length)).toEqual([8, 8, 8, 6]);
    expect(pages.map((p) => p.hasMore)).toEqual([true, true, true, false]);
    expect(pages.every((p) => p.total === 30)).toBe(true);
    expect(pages.flatMap((p) => p.items)).toEqual(NEWS_ITEMS);
    expect(queryNews({ eventsOnly: false, category: "" }, 4).items).toEqual([]);
  });

  it("filters events only and by category", () => {
    const events = queryNews({ eventsOnly: true, category: "" }, 0);
    expect(events.total).toBe(11);
    expect(events.items.every(isEvent)).toBe(true);
    expect(queryNews({ eventsOnly: true, category: "" }, 1).items).toHaveLength(3);
    const health = queryNews({ eventsOnly: false, category: "health" }, 0);
    expect(health.items.every((n) => n.category === "health")).toBe(true);
    expect(health.total).toBe(5);
    expect(queryNews({ eventsOnly: true, category: "health" }, 0).total).toBe(2);
  });
});

describe("seatsLeft", () => {
  it("takes seeded and own registrations off the capacity, never below zero", () => {
    const camp = eventBySlug("senior-health-camp")!;
    expect(seatsLeft(camp, 0)).toEqual({ capacity: 150, left: 1 });
    expect(seatsLeft(camp, 3).left).toBe(0);
    expect(eventBySlug("smart-classrooms")).toBeUndefined();
  });
});
