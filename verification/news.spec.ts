import type { Locator, Page } from "@playwright/test";
import { test, expect, mockDelays } from "./fixtures";

const URL = "/news";
const MARATHON = "/news/events/city-marathon-2026";

const cards = (page: Page) => page.locator("main article");
const card = (page: Page, title: string) => page.getByRole("article", { name: title });
const count = (page: Page) => page.getByText(/^Showing \d+ of \d+$/);
const eventsOnly = (page: Page) => page.getByRole("checkbox", { name: "Show events only" });
const category = (page: Page) => page.getByRole("combobox", { name: "Category" });
/** The empty element after the last card that triggers the next page when it nears the viewport. */
const marker = (page: Page) => page.locator('section[aria-labelledby="news-list-title"] > div[aria-hidden="true"]');
const scrollToEnd = (page: Page) => page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

/** Every card on the list carries the "Event" badge. */
async function expectOnlyEvents(cardList: Locator) {
  const n = await cardList.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) await expect(cardList.nth(i).getByText("Event", { exact: true })).toBeVisible();
}

test.describe("News & events list", () => {
  test.beforeEach(async ({ context }) => {
    // NEWS_PAGE is random 1–4s in production; fix it so every run behaves the same.
    await mockDelays(context, { delays: { NEWS_PAGE: 400, HYDRATE_NEWS: 0 } });
  });

  test("[OTH-19] more cards load on scroll, pictures load near the viewport, and the list ends", async ({ page, context }) => {
    await mockDelays(context, { delays: { NEWS_PAGE: 1200, HYDRATE_NEWS: 0 } });
    await page.goto(URL);
    await expect(cards(page)).toHaveCount(8);
    await expect(count(page)).toHaveText("Showing 8 of 30");
    await expect(marker(page)).toHaveCount(1);

    // Lazy pictures: a card far below the fold still has the placeholder; the real file is only in data-src.
    const lastPicture = cards(page).nth(7).locator("img");
    await expect(lastPicture).toHaveAttribute("src", /^data:image\/gif/);
    await expect(lastPicture).toHaveAttribute("data-src", /^\/images\/news\/\w+\.svg$/);
    expect(await lastPicture.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1);

    // No pager: the next page arrives only after scrolling to the end, after a delay.
    await expect(page.locator("main").getByRole("button", { name: /^(next|previous|load more|show more|older)/i })).toHaveCount(0);
    await scrollToEnd(page);
    await expect(page.getByRole("status").filter({ hasText: "Loading more…" })).toBeVisible();
    await expect(cards(page)).toHaveCount(8);
    // Jumping straight to the end skips the pictures in between (the middle row never came near the viewport).
    await expect(cards(page).nth(4).locator("img")).toHaveAttribute("src", /^data:image\/gif/);
    await expect(cards(page)).toHaveCount(16);
    await expect(count(page)).toHaveText("Showing 16 of 30");

    // Bringing the picture near the viewport swaps the real file in.
    await lastPicture.scrollIntoViewIfNeeded();
    await expect(lastPicture).toHaveAttribute("src", /^\/images\/news\/\w+\.svg$/);
    await expect.poll(() => lastPicture.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(1);

    // Keep scrolling until the end notice (bounded: 30 items are at most 4 pages).
    const end = page.getByText("You have reached the end of the list.");
    for (let i = 0; i < 6 && !(await end.isVisible()); i++) {
      const before = await cards(page).count();
      await scrollToEnd(page);
      await expect(async () => {
        expect((await cards(page).count()) > before || (await end.isVisible())).toBe(true);
      }).toPass({ timeout: 8_000 });
    }
    await expect(end).toBeVisible();
    await expect(cards(page)).toHaveCount(30);
    await expect(count(page)).toHaveText("Showing 30 of 30");
    await expect(page.getByRole("heading", { name: "Ward library membership is now free" })).toBeVisible();

    // Scrolling again after the end fetches nothing: the scroll marker is gone, and over a window longer
    // than NEWS_PAGE (1200ms here) no "Loading more…" ever appears and no card is added.
    await expect(marker(page)).toHaveCount(0);
    const after = await page.evaluate(async () => {
      const status = [...document.querySelectorAll("main [role=status]")];
      let sawLoading = false;
      const watch = new MutationObserver(() => {
        if (status.some((el) => el.textContent?.includes("Loading more"))) sawLoading = true;
      });
      for (const el of status) watch.observe(el, { childList: true, subtree: true, characterData: true });
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 100));
      window.scrollTo(0, document.documentElement.scrollHeight);
      await new Promise((r) => setTimeout(r, 1800));
      watch.disconnect();
      return { sawLoading, cards: document.querySelectorAll("main article").length };
    });
    expect(after).toEqual({ sawLoading: false, cards: 30 });
    await expect(count(page)).toHaveText("Showing 30 of 30");
  });

  test("[OTH-19] a failed page can be retried", async ({ page, context }) => {
    await mockDelays(context, { delays: { NEWS_PAGE: 200, HYDRATE_NEWS: 0 }, fail: ["NEWS_PAGE"] });
    await page.goto(URL);
    await expect(cards(page)).toHaveCount(8);
    await scrollToEnd(page);
    const failure = page.getByRole("alert").filter({ hasText: "More items could not be loaded." });
    await expect(failure).toBeVisible();
    await mockDelays(context, { delays: { NEWS_PAGE: 200, HYDRATE_NEWS: 0 } });
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(cards(page)).toHaveCount(16);
    await expect(failure).toHaveCount(0);
  });

  test("[BTN-03] every card's control is just “Read more”; scope it by the card", async ({ page }) => {
    await page.goto(URL);
    await expect(cards(page)).toHaveCount(8);
    const readMore = page.getByText("Read more", { exact: true });
    await expect(readMore).toHaveCount(8);
    // Same accessible name everywhere: buttons on news items, links on events.
    await expect(page.getByRole("button", { name: "Read more", exact: true })).toHaveCount(5);
    await expect(page.getByRole("link", { name: "Read more", exact: true })).toHaveCount(3);
    await expect(page.getByRole("button", { name: "Read more" }).click({ timeout: 2_000 })).rejects.toThrow(/strict mode violation/);

    const title = "Dengue prevention: fogging schedule for November published";
    const fogging = card(page, title);
    const extra = fogging.getByText(/Keep windows open during fogging/);
    await expect(extra).toBeHidden();
    await fogging.getByRole("button", { name: "Read more" }).click();
    await expect(extra).toBeVisible();
    await expect(fogging.getByRole("button", { name: "Show less" })).toHaveAttribute("aria-expanded", "true");
    // Only that card changed; the positional "first Read more" now belongs to a different card.
    await expect(readMore).toHaveCount(7);
    await expect(page.getByText(/Wet waste continues to be collected/)).toBeHidden();

    // XPath-style scoping from the heading also works (what a Selenium test would do).
    const viaHeading = page.locator(`xpath=//article[.//h3[normalize-space()="${title}"]]//button`);
    await viaHeading.click();
    await expect(extra).toBeHidden();
    await expect(fogging.getByRole("button", { name: "Read more" })).toHaveAttribute("aria-expanded", "false");
  });

  test("[DLG-14] an event's “Read more” opens its page in a new tab", async ({ page, context }) => {
    await page.goto(URL);
    const title = "Margazhi music evenings at Kalaivani Square";
    const link = card(page, title).getByRole("link", { name: "Read more" });
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    await expect(link).toHaveAttribute("href", "/news/events/margazhi-music-evenings");

    const [tab] = await Promise.all([context.waitForEvent("page"), link.click()]);
    await tab.waitForLoadState();
    await expect(tab).toHaveURL(/\/news\/events\/margazhi-music-evenings$/);
    await expect(tab.getByRole("heading", { level: 1 })).toHaveText(title);
    expect(context.pages()).toHaveLength(2);
    expect(await tab.evaluate(() => ({ opener: window.opener, referrer: document.referrer }))).toEqual({ opener: null, referrer: "" });
    // A fresh tab has no history to go back to.
    expect(await tab.goBack()).toBeNull();

    // The list stays where it was in the first tab.
    await expect(page).toHaveURL(/\/news$/);
    await expect(cards(page)).toHaveCount(8);
    await tab.close();
    await card(page, title).getByRole("link", { name: "Read more" }).focus();
    await expect(card(page, title).getByRole("link", { name: "Read more" })).toBeFocused();
  });

  test("[DRP-07] category list: keyboard from the first open, closes when focus leaves", async ({ page }) => {
    await page.goto(URL);
    const combo = category(page);
    await expect(combo).toHaveText("All categories");
    await expect(combo).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("option")).toHaveCount(0);

    // Not a <select>.
    await expect(combo.selectOption("Health", { timeout: 2_000 })).rejects.toThrow(/not a <select> element/);

    // Keyboard: ArrowDown opens on the current choice, ArrowDown ×2 → Health, Enter chooses.
    await combo.focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("listbox")).toBeVisible();
    await expect(page.getByRole("option")).toHaveCount(7);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    const activeId = await combo.getAttribute("aria-activedescendant");
    await expect(page.locator(`[id="${activeId}"]`)).toHaveText("Health");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(combo).toHaveText("Health");
    await expect(count(page)).toHaveText("Showing 5 of 5");
    for (let i = 0; i < 5; i++) await expect(cards(page).nth(i).getByText("Health", { exact: true })).toBeVisible();

    // Blur closes it: Tab, focusing another control, or blur() from script — and the options are removed.
    await combo.click();
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("listbox")).toHaveCount(0);

    await combo.click();
    const sports = await page.getByRole("option", { name: "Sports" }).elementHandle();
    await eventsOnly(page).focus();
    await expect(page.getByRole("listbox")).toHaveCount(0);
    expect(await sports!.evaluate((el) => el.isConnected)).toBe(false);

    await combo.click();
    await expect(page.getByRole("listbox")).toBeVisible();
    await combo.evaluate((el: HTMLElement) => el.blur());
    await expect(page.getByRole("listbox")).toHaveCount(0);

    // A real mouse click on an option works (its mousedown does not take focus away).
    await combo.click();
    await page.getByRole("option", { name: "Sports" }).click();
    await expect(combo).toHaveText("Sports");
    await expect(count(page)).toHaveText("Showing 4 of 4");
    await expect(card(page, "Astheenapuram City Marathon 2026")).toBeVisible();
    await expect(card(page, "Corporation schools to get 120 smart classrooms")).toHaveCount(0);
  });

  test("[CHK-08] the saved “events only” choice is applied only after hydration", async ({ page, context }) => {
    await mockDelays(context, { delays: { NEWS_PAGE: 400, HYDRATE_NEWS: 1000 } });
    await page.goto(URL);
    const box = eventsOnly(page);
    await expect(box).toHaveAttribute("aria-checked", "false");
    await expect(async () => {
      await box.click();
      await expect(box).toBeChecked({ timeout: 500 });
    }).toPass({ timeout: 10_000 });
    await expect(count(page)).toHaveText("Showing 8 of 11");
    await expectOnlyEvents(cards(page));
    expect(await page.evaluate(() => localStorage.getItem("amc.newsEventsOnly"))).toBe("true");

    // Reload with a slower hydration so the window is wide: the server knows nothing of the saved choice.
    await mockDelays(context, { delays: { NEWS_PAGE: 400, HYDRATE_NEWS: 4000 } });
    const html = await (await page.request.get(URL)).text();
    expect(html).toMatch(/role="checkbox" aria-checked="false"/);
    await page.reload();
    await expect(box).not.toBeChecked();
    await expect(count(page)).toHaveText("Showing 8 of 30");
    await expect(card(page, "Storm-water drain desilting completed in 31 of 48 wards")).toBeVisible();
    // A click now does nothing (the box has no handler yet): check() reports that …
    await expect(box.check({ timeout: 1_500 })).rejects.toThrow(/did not change its state/);
    await expect(box).not.toBeChecked();
    // … and then, with no further input, the box ticks itself and the list reloads with events only.
    await expect(box).toBeChecked({ timeout: 8_000 });
    await expect(count(page)).toHaveText("Showing 8 of 11");
    await expect(card(page, "Storm-water drain desilting completed in 31 of 48 wards")).toHaveCount(0);
    await expectOnlyEvents(cards(page));

    // Unticking is saved too: after the next load it stays unticked.
    await box.click();
    await expect(box).not.toBeChecked();
    await expect(count(page)).toHaveText("Showing 8 of 30");
    await expect.poll(() => page.evaluate(() => localStorage.getItem("amc.newsEventsOnly"))).toBe("false");
    await mockDelays(context, { delays: { NEWS_PAGE: 400, HYDRATE_NEWS: 0 } });
    await page.reload();
    // Wait until the island has hydrated (React has attached its handlers to the box), so the saved
    // choice has been read; it must still be unticked with the full list.
    await expect
      .poll(() => box.evaluate((el) => Object.keys(el).some((k) => k.startsWith("__reactProps"))), { timeout: 8_000 })
      .toBe(true);
    await expect(box).not.toBeChecked();
    await expect(count(page)).toHaveText("Showing 8 of 30");
    await expect(card(page, "Storm-water drain desilting completed in 31 of 48 wards")).toBeVisible();
  });
});

test.describe("Event page", () => {
  test.beforeEach(async ({ context }) => {
    await mockDelays(context, { delays: { EVENT_SEATS: 1500, EVENT_REGISTER: 300 } });
  });

  test("[HYD-03] the Register button is replaced once seats are checked; an early reference goes stale", async ({ page }) => {
    await page.goto(MARATHON);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Astheenapuram City Marathon 2026");
    await expect(page.getByRole("status")).toHaveText("Checking seat availability…");
    const early = await page.$("#ev-register");
    expect(early).not.toBeNull();
    await expect(page.getByRole("status")).toHaveText("386 of 3000 seats available");

    // The element found first is no longer in the document: same id and text, a different node.
    expect(await early!.evaluate((el) => el.isConnected)).toBe(false);
    await expect(early!.click({ timeout: 2_000 })).rejects.toThrow(/not attached to the DOM/);
    const now = await page.$("#ev-register");
    expect(await now!.evaluate((el, old) => el !== old, early)).toBe(true);
    await expect(page.locator("#ev-register")).toHaveText("Register");

    // A locator re-resolves, so it reaches the new button.
    await page.getByRole("button", { name: "Register" }).click();
    await page.getByLabel("Name").fill("Meena Rajendran");
    await page.getByLabel("Mobile number").fill("9841023456");
    await page.getByLabel("Number of people").selectOption("3");
    await page.getByRole("button", { name: "Confirm registration" }).click();
    await expect(page.getByText("You are registered for Astheenapuram City Marathon 2026.")).toBeVisible();
    await expect(page.getByText(/^EVR\/\d{4}\/\d{5}$/)).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("383 of 3000 seats available");

    // The registration is remembered in this browser.
    await page.reload();
    await expect(page.getByText("You are registered for Astheenapuram City Marathon 2026.")).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("383 of 3000 seats available");
    await expect(page.locator("#ev-register")).toHaveCount(0);
  });

  test("[HYD-03] the first Register button works too, before the seat check returns", async ({ page, context }) => {
    await mockDelays(context, { delays: { EVENT_SEATS: 6000, EVENT_REGISTER: 0 } });
    await page.goto(MARATHON);
    const register = page.locator("#ev-register");
    await expect(async () => {
      await register.click();
      await expect(page.getByLabel("Number of people")).toBeVisible({ timeout: 500 });
    }).toPass({ timeout: 5_000 });
    await expect(page.getByRole("status")).toHaveText("Checking seat availability…");
    // The form stays open when the seat check returns.
    await expect(page.getByRole("status")).toHaveText("386 of 3000 seats available", { timeout: 10_000 });
    await expect(page.getByLabel("Number of people")).toBeVisible();
  });

  test("[HYD-03] registration checks the form and the seats left", async ({ page, context }) => {
    await mockDelays(context, { delays: { EVENT_SEATS: 0, EVENT_REGISTER: 0 } });
    await page.goto("/news/events/senior-health-camp");
    await expect(page.getByRole("status")).toHaveText("1 of 150 seats available");
    await page.locator("#ev-register").click();
    await page.getByLabel("Number of people").selectOption("2");
    await page.getByRole("button", { name: "Confirm registration" }).click();
    await expect(page.getByText("Enter your name.")).toBeVisible();
    await expect(page.getByText("Enter a valid 10-digit mobile number.")).toBeVisible();
    await expect(page.getByText("Not enough seats are left for that many people.")).toBeVisible();
    await page.getByLabel("Name").fill("Arulmozhi Kannan");
    await page.getByLabel("Mobile number").fill("9790011223");
    await page.getByLabel("Number of people").selectOption("1");
    await page.getByRole("button", { name: "Confirm registration" }).click();
    await expect(page.getByText("You are registered for Free health check-up camp for senior citizens.")).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("All seats have been taken");
    const sms = await page.evaluate(() => JSON.parse(localStorage.getItem("amc.sms") ?? "[]")[0]);
    expect(sms.to).toBe("9790011223");
    expect(sms.body).toMatch(/^AMC: Registration EVR\/\d{4}\/\d{5} confirmed for Free health check-up camp for senior citizens on 28\/11\/2026, 09:00 – 14:00, for 1 person\(s\)\./);
  });

  test("[HYD-03] a failed seat check shows an error with a retry; the first button stays until a check succeeds", async ({ page, context }) => {
    await mockDelays(context, { delays: { EVENT_SEATS: 300, EVENT_REGISTER: 0 }, fail: ["EVENT_SEATS"] });
    await page.goto(MARATHON);
    const failure = page.getByRole("alert").filter({ hasText: "Seat availability could not be checked right now." });
    await expect(failure).toBeVisible();
    await expect(page.getByText("All seats have been taken")).toHaveCount(0);
    const early = await page.$("#ev-register");
    await expect(page.locator("#ev-register")).toBeEnabled();

    await mockDelays(context, { delays: { EVENT_SEATS: 300, EVENT_REGISTER: 0 } });
    await failure.getByRole("button", { name: "Check again" }).click();
    await expect(page.getByRole("status")).toHaveText("386 of 3000 seats available");
    await expect(failure).toHaveCount(0);
    // The successful check replaces the button, as on a normal load.
    expect(await early!.evaluate((el) => el.isConnected)).toBe(false);
    await expect(page.getByRole("button", { name: "Register" })).toBeEnabled();
  });

  test("a news item has no event page", async ({ page }) => {
    const res = await page.goto("/news/events/smart-classrooms");
    expect(res?.status()).toBe(404);
  });
});
