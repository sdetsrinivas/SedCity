import type { Page } from "@playwright/test";
import data from "../src/mock/data/directory.json";
import { test, expect, mockDelays } from "./fixtures";

const URL = "/directory/offices";
const BASE = "http://localhost:3100";
const office = (id: string) => data.offices.find((o) => o.id === id)!;
const LAST = data.offices[data.offices.length - 1];
const CSC = office("CSC-05");

const listbox = (page: Page) => page.getByRole("listbox", { name: "Offices" });
const details = (page: Page) => page.getByRole("region", { name: "Office details" });
const detailsHeading = (page: Page) => details(page).getByRole("heading", { level: 3 });
const locateBtn = (page: Page) => page.getByRole("button", { name: "Use my current location" });
const mapFrame = (page: Page) => page.frameLocator('iframe[title="Map of Corporation offices"]');
/** Error messages (Next.js also keeps an empty role=alert route announcer on every page). */
const alert = (page: Page) => page.getByRole("alert").filter({ hasText: /\S/ });
const permission = (page: Page) => page.evaluate(async () => (await navigator.permissions.query({ name: "geolocation" })).state);

/** The list is mounted by the page's script, so once it exists the page has hydrated. */
async function open(page: Page) {
  await page.goto(URL);
  await expect(listbox(page)).toBeVisible();
}

test.describe("Find nearest office", () => {
  test.beforeEach(async ({ context }) => {
    await mockDelays(context, { delays: { MAP_IFRAME: 300, OFFICE_NEAREST: 300 } });
  });

  // ───────────────────────── DLG-17 ─────────────────────────
  test("[DLG-17] with location permission granted, the nearest office is named, listed first and chosen", async ({ page, context }) => {
    await mockDelays(context, { delays: { MAP_IFRAME: 300, OFFICE_NEAREST: 1200 } });
    await context.grantPermissions(["geolocation"], { origin: BASE });
    await context.setGeolocation({ latitude: CSC.lat + 0.001, longitude: CSC.lng });
    await open(page);
    expect(await permission(page)).toBe("granted");
    await expect(detailsHeading(page)).toHaveText("Corporation Head Office");

    await locateBtn(page).click();
    await expect(page.getByText("Finding offices near you…")).toBeVisible();
    await expect(page.getByText(`Nearest office: ${CSC.name.en}, 0.1 km from your location.`)).toBeVisible();
    await expect(detailsHeading(page)).toHaveText(CSC.name.en);
    await expect(details(page).getByText("0.1 km from your location")).toBeVisible();
    const first = listbox(page).getByRole("option").first();
    await expect(first).toContainText(CSC.name.en);
    await expect(first).toContainText("0.1 km");
    await expect(first).toHaveAttribute("aria-selected", "true");
    await expect(alert(page)).toHaveCount(0);
    // The map is told too.
    await expect(mapFrame(page).locator("text").filter({ hasText: "You are here" })).toBeVisible();
    await expect(mapFrame(page).locator("text").filter({ hasText: CSC.name.en })).toBeVisible();

    // A position outside the city: still ranked, with a notice.
    await context.setGeolocation({ latitude: 13.0827, longitude: 80.2707 });
    await locateBtn(page).click();
    await expect(page.getByText(/^Your location is about [\d,.]+ km from the city centre, outside the Corporation limits/)).toBeVisible();
    await expect(page.getByText(/^Nearest office: /)).toBeVisible();
    await expect(page.getByText(`Nearest office: ${CSC.name.en}, 0.1 km from your location.`)).toHaveCount(0);

    await page.getByRole("button", { name: "Clear location" }).click();
    await expect(page.getByText(/^Nearest office: /)).toHaveCount(0);
    await expect(listbox(page).getByRole("option").first()).toContainText("Corporation Head Office");
  });

  test("[DLG-17] without a permission grant the request is refused at once and an error is shown", async ({ page }) => {
    await open(page);
    // Headless Chromium reports "prompt" but answers the request with PERMISSION_DENIED (measured).
    expect(await permission(page)).toBe("prompt");
    await locateBtn(page).click();
    await expect(alert(page)).toHaveText("Location access is turned off for this site. You can search by office name, area or PIN code instead.");
    await expect(page.getByText(/^Nearest office: /)).toHaveCount(0);
    await expect(detailsHeading(page)).toHaveText("Corporation Head Office");
    await expect(listbox(page).getByRole("option").first()).not.toContainText("km");
  });

  test("[DLG-17] granted without a position times out; a failed ranking shows an error", async ({ page, context }) => {
    await mockDelays(context, { delays: { MAP_IFRAME: 300, LOCATE_TIMEOUT: 1500 } });
    await context.grantPermissions(["geolocation"], { origin: BASE });
    await open(page);
    await locateBtn(page).click();
    await expect(page.getByText("Waiting for your location…")).toBeVisible();
    await expect(locateBtn(page)).toBeDisabled();
    await expect(alert(page)).toHaveText("Your location could not be found. Please try again, or search by office name, area or PIN code.");
    await expect(locateBtn(page)).toBeEnabled();

    await mockDelays(context, { delays: { MAP_IFRAME: 300, OFFICE_NEAREST: 300 }, fail: ["OFFICE_NEAREST"] });
    await context.setGeolocation({ latitude: CSC.lat, longitude: CSC.lng });
    await locateBtn(page).click();
    await expect(alert(page)).toHaveText("Offices near you could not be found right now. Please try again.");
    await expect(page.getByText(/^Nearest office: /)).toHaveCount(0);
    await expect(detailsHeading(page)).toHaveText("Corporation Head Office");
  });

  test("[DLG-17] with every delay scaled to 0, a granted position is still found (the time limit is not scaled)", async ({ page, context }) => {
    await mockDelays(context, { scale: 0 });
    await context.grantPermissions(["geolocation"], { origin: BASE });
    await context.setGeolocation({ latitude: CSC.lat + 0.001, longitude: CSC.lng });
    await open(page);
    await locateBtn(page).click();
    await expect(page.getByText(`Nearest office: ${CSC.name.en}, 0.1 km from your location.`)).toBeVisible();
    await expect(alert(page)).toHaveCount(0);
  });

  test("[DLG-17] a failed attempt after a successful one removes the earlier distances", async ({ page, context }) => {
    await context.grantPermissions(["geolocation"], { origin: BASE });
    await context.setGeolocation({ latitude: CSC.lat + 0.001, longitude: CSC.lng });
    await open(page);
    await locateBtn(page).click();
    await expect(page.getByText(`Nearest office: ${CSC.name.en}, 0.1 km from your location.`)).toBeVisible();
    await expect(mapFrame(page).locator("text").filter({ hasText: "You are here" })).toBeVisible();

    await context.clearPermissions();
    await locateBtn(page).click();
    await expect(alert(page)).toHaveText("Location access is turned off for this site. You can search by office name, area or PIN code instead.");
    await expect(page.getByText(/^Nearest office: /)).toHaveCount(0);
    await expect(page.getByText(/km from your location/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Clear location" })).toHaveCount(0);
    const first = listbox(page).getByRole("option").first();
    await expect(first).toContainText("Corporation Head Office");
    await expect(first).not.toContainText("km");
    await expect(mapFrame(page).locator("text").filter({ hasText: "You are here" })).toHaveCount(0);
    // The office chosen by the earlier attempt stays chosen.
    await expect(detailsHeading(page)).toHaveText(CSC.name.en);
  });

  // ───────────────────────── FRM-04 ─────────────────────────
  test("[FRM-04] the map frame is inserted only after about five seconds and has no id or name", async ({ page, context }) => {
    await mockDelays(context, {});
    const started = Date.now();
    await page.goto(URL);
    await expect(page.getByText("Loading map…")).toBeVisible();
    await expect(page.locator("iframe")).toHaveCount(0);
    // A wait shorter than the delay fails.
    await expect(expect(page.locator("iframe")).toBeAttached({ timeout: 3000 })).rejects.toThrow();
    await expect(page.locator("iframe")).toBeAttached({ timeout: 10_000 });
    expect(Date.now() - started).toBeGreaterThanOrEqual(5000);
    await expect(page.getByText("Loading map…")).toHaveCount(0);

    const iframe = page.locator("iframe");
    expect(await iframe.evaluate((el) => [el.id, el.getAttribute("name")])).toEqual(["", null]);
    await expect(iframe).toHaveAttribute("src", "/maps/offices");
    await expect(mapFrame(page).getByRole("button", { name: "Corporation Head Office" })).toBeVisible();
    expect(page.frames()).toHaveLength(2);
    expect(page.frames()[1].name()).toBe("");
    // Markers belong to the frame's document, not the page's.
    await expect(page.getByRole("button", { name: "Zone Office – Ripon" })).toHaveCount(0);
  });

  test("[FRM-04] choosing on the map chooses on the page, and the other way round", async ({ page }) => {
    await open(page);
    const map = mapFrame(page);
    await expect(map.locator("text").filter({ hasText: "Corporation Head Office" })).toBeVisible();

    await map.getByRole("button", { name: LAST.name.en }).click();
    await expect(detailsHeading(page)).toHaveText(LAST.name.en);
    // The list scrolls to it (it was not rendered before).
    await expect(listbox(page).getByRole("option", { name: LAST.name.en })).toHaveAttribute("aria-selected", "true");
    await expect(map.locator("text").filter({ hasText: LAST.name.en })).toBeVisible();

    await listbox(page).evaluate((el) => { el.scrollTop = 0; });
    await listbox(page).getByRole("option", { name: /^Zone Office – Kalaivani/ }).click();
    await expect(detailsHeading(page)).toHaveText("Zone Office – Kalaivani");
    await expect(map.locator("text").filter({ hasText: "Zone Office – Kalaivani" })).toBeVisible();
    await expect(map.locator("text").filter({ hasText: LAST.name.en })).toHaveCount(0);
  });

  test("[FRM-04] the map follows the theme switch without reloading the frame", async ({ page }) => {
    await open(page);
    const map = mapFrame(page);
    await expect(map.getByRole("button", { name: "Corporation Head Office" })).toBeVisible();
    const mapTheme = () => map.locator("html").getAttribute("data-theme");
    expect(await mapTheme()).toBe("light");
    // Mark the frame's document: a reload would lose the mark.
    await map.locator("html").evaluate((el) => { (el as HTMLElement).dataset.mark = "1"; });

    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await expect(map.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(map.locator("html")).toHaveAttribute("data-mark", "1");
    await expect(page.locator("iframe")).toHaveCount(1);
    await page.getByRole("button", { name: "Switch to light theme" }).click();
    await expect(map.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("[FRM-04] if the map cannot be loaded, an error with Try again replaces it", async ({ page, context }) => {
    await mockDelays(context, { delays: { MAP_IFRAME: 300 }, fail: ["MAP_IFRAME"] });
    await open(page);
    await expect(alert(page)).toContainText("The map could not be loaded right now.");
    await expect(page.locator("iframe")).toHaveCount(0);
    await mockDelays(context, { delays: { MAP_IFRAME: 300 } });
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.locator("iframe")).toBeAttached();
    await expect(alert(page)).toHaveCount(0);
  });

  // ───────────────────────── DYN-08 ─────────────────────────
  test("[DYN-08] the last service is clipped by two scroll boxes; scrolling the window does not reveal it", async ({ page }) => {
    await open(page);
    const outer = page.getByRole("region", { name: "Corporation Head Office" });
    const inner = details(page).getByRole("list", { name: "Services at this office" });
    const link = inner.getByRole("link", { name: "Register a grievance" });
    const top = (l: typeof outer) => l.evaluate((el) => el.scrollTop);
    const windowY = () => page.evaluate(() => window.scrollY);

    await expect(link).toBeVisible();
    await expect(link).not.toBeInViewport();
    expect(await inner.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    expect(await outer.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(link).not.toBeInViewport();
    await page.evaluate(() => window.scrollTo(0, 0));

    // Wheel over the panel scrolls the panel only; the page stays put (overscroll-behavior: contain).
    await outer.scrollIntoViewIfNeeded();
    const y = await windowY();
    const box = (await outer.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 40);
    await page.mouse.wheel(0, 3000);
    await expect.poll(() => top(outer)).toBeGreaterThan(0);
    expect(await windowY()).toBe(y);
    expect(await top(inner)).toBe(0);
    await expect(link).not.toBeInViewport();

    // Now the inner list: only it moves.
    const outerTop = await top(outer);
    const listBox = (await inner.boundingBox())!;
    await page.mouse.move(listBox.x + listBox.width / 2, listBox.y + listBox.height / 2);
    await page.mouse.wheel(0, 2000);
    await expect.poll(() => top(inner)).toBeGreaterThan(0);
    await expect(link).toBeInViewport();
    expect(await top(outer)).toBe(outerTop);
    expect(await windowY()).toBe(y);
  });

  test("[DYN-08] an actionable click scrolls both boxes and follows the link", async ({ page }) => {
    await open(page);
    const link = details(page).getByRole("link", { name: "Register a grievance" });
    await expect(link).not.toBeInViewport();
    await link.click();
    await expect(page).toHaveURL(/\/grievances\/new$/);
  });

  // ───────────────────────── OTH-20 ─────────────────────────
  test("[OTH-20] only the rows in view exist; scrolling reuses the same row elements", async ({ page, request }) => {
    const html = await (await request.get(URL)).text();
    expect(html).not.toContain('role="option"');
    expect(html).not.toContain(LAST.name.en);

    await open(page);
    await expect(page.getByText("Showing 103 of 103 offices")).toBeVisible();
    const options = listbox(page).getByRole("option");
    const count = await options.count();
    expect(count).toBeGreaterThan(4);
    expect(count).toBeLessThan(20);
    await expect(options.first()).toHaveAttribute("aria-setsize", "103");
    await expect(page.getByText(LAST.name.en)).toHaveCount(0);

    const firstRow = await options.first().elementHandle();
    const firstId = await firstRow!.getAttribute("id");
    expect(firstId).toMatch(/^ofl-[a-z0-9]+-0$/);
    expect(await firstRow!.textContent()).toContain("Corporation Head Office");

    await listbox(page).evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await expect(listbox(page).getByRole("option", { name: LAST.name.en })).toBeVisible();
    await expect(listbox(page).getByRole("option", { name: LAST.name.en })).toHaveAttribute("aria-posinset", "103");
    await expect(listbox(page).getByRole("option", { name: /^Corporation Head Office/ })).toHaveCount(0);
    // Same element, same id, different office.
    expect(await firstRow!.evaluate((el) => el.isConnected)).toBe(true);
    expect(await firstRow!.getAttribute("id")).toBe(firstId);
    expect(await firstRow!.textContent()).not.toContain("Corporation Head Office");
    expect(await listbox(page).getByRole("option").count()).toBeLessThan(20);

    await listbox(page).getByRole("option", { name: LAST.name.en }).click();
    await expect(detailsHeading(page)).toHaveText(LAST.name.en);
  });

  test("[OTH-20] the list works by keyboard and follows the filters", async ({ page }) => {
    await open(page);
    const box = listbox(page);
    const active = () => box.evaluate((el) => document.getElementById(el.getAttribute("aria-activedescendant") ?? "")?.textContent ?? "");
    await box.focus();
    await expect.poll(active).toContain("Corporation Head Office");
    await page.keyboard.press("ArrowDown");
    await expect.poll(active).toContain("Zone Office – Thenmalai");
    await page.keyboard.press("End");
    await expect.poll(active).toContain(LAST.name.en);
    await page.keyboard.press("Enter");
    await expect(detailsHeading(page)).toHaveText(LAST.name.en);
    await page.keyboard.press("Home");
    await expect.poll(active).toContain("Corporation Head Office");
    await page.keyboard.press("Space");
    await expect(detailsHeading(page)).toHaveText("Corporation Head Office");

    await page.getByLabel("Type of office").selectOption({ label: "Water supply depot" });
    await expect(page.getByText("Showing 12 of 103 offices")).toBeVisible();
    await page.getByLabel("Office name, area or PIN code").fill("kondai");
    await expect(page.getByText("Showing 1 of 103 offices")).toBeVisible();
    await expect(box.getByRole("option")).toHaveCount(1);
    await expect(box.getByRole("option")).toContainText("Water Supply Depot – Kondai Medu");
    await page.getByLabel("Office name, area or PIN code").fill("zzzz");
    await expect(page.getByText("No office matches your search.")).toBeVisible();
    await expect(box).toBeHidden();
  });
});
