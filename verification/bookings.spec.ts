import type { Page } from "@playwright/test";
import { test, expect, mockDelays, seedSession } from "./fixtures";
import { VENUE_NAME, bookingDays } from "./booking-dates";
import { addDays } from "../src/lib/format";
import { firstBookable, freeSlots, lastBookable, monthGrid, monthOf, slotLabel, takenSlots, venueById } from "../src/modules/bookings/booking";

const URL = "/bookings";
const PURPOSE = "Purpose of the booking (e.g. wedding reception)";
const GUESTS = "Expected number of guests";
const V01 = venueById("V01")!;

/** Local ISO date in the browser (the page uses the same clock). */
const browserToday = (page: Page) =>
  page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
/** The day's accessible name as the page builds it ("Saturday, 21 November 2026" in en-IN). */
const longDate = (page: Page, iso: string) =>
  page.evaluate((d) => {
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y, m - 1, day).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }, iso);
const ddmmyyyy = (iso: string) => iso.split("-").reverse().join("/");

const trigger = (page: Page) => page.getByRole("button", { name: "Booking date" });
const calendar = (page: Page) => page.getByRole("dialog", { name: "Choose the booking date" });
const slotMap = (page: Page) => page.getByRole("group", { name: /^Time slots on/ });
const confirmDialog = (page: Page) => page.getByRole("dialog", { name: "Confirm your booking" });
const tile = (page: Page, name: string) => page.locator("div[tabindex='0']").filter({ hasText: name });

async function open(page: Page) {
  await page.goto(URL);
  await page.getByLabel("Venue", { exact: true }).selectOption({ label: VENUE_NAME });
  const today = await browserToday(page);
  const days = bookingDays(today);
  expect(days, `booking days for ${today}`).not.toBeNull();
  return { today, ...days! };
}

/** Choose a day with the calendar: open it, page forward to the day's month (at most 3 months), click it. */
async function pickDate(page: Page, iso: string) {
  await trigger(page).click();
  const name = await longDate(page, iso);
  const day = calendar(page).getByRole("button", { name, exact: true });
  for (let i = 0; i < 3 && !(await day.isVisible()); i++) await calendar(page).getByRole("button", { name: "Next month" }).click();
  await day.click();
  await expect(trigger(page)).toHaveText(ddmmyyyy(iso));
}

/** A bookable day with at least one booked slot and two free neighbouring slots (bounded by the window). */
function mixedDay(today: string) {
  for (let d = firstBookable(today); d <= lastBookable(today); d = addDays(d, 1)) {
    const free = freeSlots(V01, d);
    const taken = takenSlots(V01, d);
    const pair = free.find((h) => free.includes(h + 2));
    if (taken.length && pair !== undefined && free.length) return { day: d, taken: taken[0], pair };
  }
  return null;
}

async function fillEvent(page: Page) {
  await page.getByPlaceholder(PURPOSE).fill("Family get-together");
  await page.getByPlaceholder(GUESTS).fill("120");
}

test.describe("Hall / park booking", () => {
  test.beforeEach(async ({ context }) => {
    await seedSession(context);
    await mockDelays(context, { delays: { BOOKING_SLOTS: 300, BOOKING_SUBMIT: 300 } });
  });

  test("[DAT-02] the calendar is a popover of buttons; unavailable days are disabled and numbers repeat", async ({ page }) => {
    const { today, first, closed } = await open(page);
    await trigger(page).click();
    const cal = calendar(page);
    await expect(cal).toBeVisible();
    await expect(cal.locator("table, [role=grid], [role=gridcell], input")).toHaveCount(0);

    // The first bookable day has the focus as soon as the calendar opens.
    await expect(cal.getByRole("button", { name: await longDate(page, first), exact: true })).toBeFocused();

    // An unavailable day is a natively disabled button with a reason in its title; a click cannot choose it.
    const off = cal.getByRole("button", { name: await longDate(page, closed), exact: true });
    await expect(off).toBeDisabled();
    await expect(off).toHaveAttribute("title", /Not open for booking|Venue closed|Fully booked/);
    await expect(off.click({ timeout: 1000 })).rejects.toThrow();
    await expect(trigger(page)).toHaveText("Choose a date");

    // Days of the next month fill the last week and repeat the visible numbers 1, 2, …
    const opens = monthOf(first);
    const trailing = monthGrid(opens).flat().find((d) => monthOf(d) > opens);
    if (trailing) {
      const n = String(Number(trailing.slice(8)));
      await expect(cal.getByRole("button", { name: n, exact: true })).toHaveCount(0); // names are full dates
      await expect(cal.getByText(n, { exact: true })).toHaveCount(2);
    }
    await expect(cal.getByText(`Bookings are open from ${ddmmyyyy(firstBookable(today))} to ${ddmmyyyy(lastBookable(today))}.`)).toBeVisible();
  });

  test("[DAT-02] keyboard: arrows skip unavailable days, Enter chooses, Escape closes", async ({ page }) => {
    const { first, second } = await open(page);
    await trigger(page).click();
    await page.keyboard.press("ArrowRight");
    await expect(calendar(page).getByRole("button", { name: await longDate(page, second), exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(calendar(page)).toBeHidden();
    await expect(trigger(page)).toHaveText(ddmmyyyy(second));
    await expect(trigger(page)).toBeFocused();

    // Reopening focuses the chosen day (aria-pressed); Escape closes without changing it.
    await page.keyboard.press("Enter");
    const chosen = calendar(page).getByRole("button", { name: await longDate(page, second), exact: true });
    await expect(chosen).toBeFocused();
    await expect(chosen).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("ArrowLeft");
    await expect(calendar(page).getByRole("button", { name: await longDate(page, first), exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(calendar(page)).toBeHidden();
    await expect(trigger(page)).toHaveText(ddmmyyyy(second));
  });

  test("[DAT-02] later dates need the month buttons; a next-month day in this month's grid switches month", async ({ page }) => {
    const { first, opens, nav, nextMonth, otherBookable } = await open(page);
    await trigger(page).click();
    const cal = calendar(page);
    const label = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    await expect(cal.getByText(label(`${opens}-01`), { exact: true })).toBeVisible();
    // Usually disabled; enabled when the window's first month has no bookable day left (opens a month later).
    const prev = cal.getByRole("button", { name: "Previous month" });
    await (nav.prev ? expect(prev).toBeEnabled() : expect(prev).toBeDisabled());
    await expect(cal.getByRole("button", { name: "Next month" })).toBeEnabled();
    await cal.getByRole("button", { name: "Next month" }).click();
    await expect(cal.getByText(label(nextMonth), { exact: true })).toBeVisible();
    await cal.getByRole("button", { name: await longDate(page, nextMonth), exact: true }).click();
    await expect(trigger(page)).toHaveText(ddmmyyyy(nextMonth));

    if (otherBookable) {
      await trigger(page).click();
      await cal.getByRole("button", { name: "Previous month" }).click();
      await expect(cal.getByText(label(first), { exact: true })).toBeVisible();
      await cal.getByRole("button", { name: await longDate(page, otherBookable), exact: true }).click();
      await expect(trigger(page)).toHaveText(ddmmyyyy(otherBookable));
    }
  });

  test("[DAT-02] keyboard: paging to the last or first month keeps focus in the calendar, so Escape still closes it", async ({ page }) => {
    const { today, opens } = await open(page);
    await trigger(page).click();
    const cal = calendar(page);
    const prev = cal.getByRole("button", { name: "Previous month" });
    const next = cal.getByRole("button", { name: "Next month" });
    const months = (a: string, b: string) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5)) - Number(a.slice(5));

    // Shift+Tab from the focused day reaches "Next month"; Enter pages until the window's last month disables it.
    await page.keyboard.press("Shift+Tab");
    await expect(next).toBeFocused();
    for (let i = months(opens, monthOf(lastBookable(today))); i > 0; i--) await page.keyboard.press("Enter");
    await expect(next).toBeDisabled();
    await expect(prev).toBeFocused();

    // The same at the other end: "Previous month" to the first month hands focus to "Next month".
    for (let i = months(monthOf(firstBookable(today)), monthOf(lastBookable(today))); i > 0; i--) await page.keyboard.press("Enter");
    await expect(prev).toBeDisabled();
    await expect(next).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(cal).toBeHidden();
    await expect(trigger(page)).toBeFocused();
  });

  test("[OTH-21] slots are SVG rects named by <title>; booked ones only explain; the map is replaced on reload", async ({ page, context }) => {
    await mockDelays(context, { delays: { BOOKING_SLOTS: 800, BOOKING_SUBMIT: 300 } });
    const { today, first } = await open(page);
    const mixed = mixedDay(today);
    expect(mixed).not.toBeNull();
    await pickDate(page, mixed!.day);
    await expect(page.getByText("Checking availability…")).toBeVisible();
    await expect(slotMap(page)).toBeVisible();
    await expect(page.getByText("Checking availability…")).toBeHidden();

    // SVG namespace: plain XPath finds no rect, local-name() does.
    await expect(slotMap(page).locator("xpath=.//rect")).toHaveCount(0);
    await expect(slotMap(page).locator("xpath=.//*[local-name()='rect'][@role='checkbox']")).toHaveCount(8);
    expect(await slotMap(page).getByRole("checkbox").first().evaluate((el) => [el.tagName, el.namespaceURI])).toEqual(["rect", "http://www.w3.org/2000/svg"]);

    // The time labels are axis ticks, not the slots: clicking one chooses nothing.
    await slotMap(page).getByText("12:00", { exact: true }).click();
    await expect(slotMap(page).locator("[aria-checked=true]")).toHaveCount(0);

    // A booked slot is not disabled (no such thing in SVG): the click only explains.
    const booked = slotMap(page).getByRole("checkbox", { name: `${slotLabel(mixed!.taken)}, booked` });
    await expect(booked).toHaveAttribute("aria-disabled", "true");
    expect(await booked.getAttribute("fill")).toMatch(/^url\(#.+\)$/);
    // Playwright counts aria-disabled as disabled and waits; a forced click goes through and only explains.
    await expect(booked.click({ timeout: 1000 })).rejects.toThrow();
    await booked.click({ force: true });
    await expect(booked).toHaveAttribute("aria-checked", "false");
    await expect(page.getByText(`${slotLabel(mixed!.taken)} is already booked. Choose another time.`)).toBeVisible();

    // Two neighbouring free slots make one run; keyboard Space toggles too.
    const a = slotMap(page).getByRole("checkbox", { name: `${slotLabel(mixed!.pair)}, available` });
    const b = slotMap(page).getByRole("checkbox", { name: `${slotLabel(mixed!.pair + 2)}, available` });
    await a.click();
    await b.focus();
    await page.keyboard.press("Space");
    await expect(a).toHaveAttribute("aria-checked", "true");
    await expect(b).toHaveAttribute("aria-checked", "true");
    const from = String(mixed!.pair).padStart(2, "0");
    const to = String(mixed!.pair + 4).padStart(2, "0");
    await expect(page.getByText(`Selected: ${from}:00 – ${to}:00 (4 hours)`)).toBeVisible();
    await expect(page.getByText(/^Hire charge \(4 hours × ₹600\)$/)).toBeVisible();

    // Another day loads a new <svg>: a kept reference to the old one is detached and the choice is gone.
    const old = await slotMap(page).elementHandle();
    await pickDate(page, mixed!.day === first ? (bookingDays(today)!.second) : first);
    await expect(slotMap(page)).toBeVisible();
    expect(await old!.evaluate((el) => el.isConnected)).toBe(false);
    await expect(slotMap(page).locator("[aria-checked=true]")).toHaveCount(0);
  });

  test("[OTH-21] when availability cannot be loaded there is no slot map, only an error", async ({ page, context }) => {
    await mockDelays(context, { delays: { BOOKING_SLOTS: 300 }, fail: ["BOOKING_SLOTS"] });
    const { first } = await open(page);
    await pickDate(page, first);
    await expect(page.getByRole("alert").filter({ hasText: "Availability could not be checked right now." })).toBeVisible();
    await expect(slotMap(page)).toHaveCount(0);
    await expect(page.getByText(/^Selected:/)).toHaveCount(0);
  });

  test("[CHK-07] amenity tiles: state only as a hashed class and an SVG path", async ({ page }) => {
    await open(page);
    const gen = tile(page, "Generator backup");
    await expect(gen).toHaveCount(1);
    await expect(page.getByRole("checkbox", { name: /Generator backup/ })).toHaveCount(0);
    for (const attr of ["role", "aria-checked", "aria-pressed"]) expect(await gen.getAttribute(attr)).toBeNull();
    await expect(gen.check({ timeout: 1000 })).rejects.toThrow();

    const path = gen.locator("svg path");
    const before = await path.getAttribute("d");
    await expect(gen).not.toHaveClass(/_tileOn\b/);
    await gen.click();
    await expect(gen).toHaveClass(/_tileOn\b/);
    expect(await path.getAttribute("d")).not.toBe(before);
    await expect(page.getByText("Amenities: Generator backup")).toBeVisible();

    // Keyboard: Space and Enter toggle a focused tile.
    const stage = tile(page, "Stage with backdrop");
    await stage.focus();
    await page.keyboard.press("Space");
    await expect(stage).toHaveClass(/_tileOn\b/);
    await expect(page.getByText("Amenities: Generator backup, Stage with backdrop")).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(stage).not.toHaveClass(/_tileOn\b/);
    await gen.click();
    await expect(gen).not.toHaveClass(/_tileOn\b/);
    await expect(page.getByText(/^Amenities: /)).toHaveCount(0);
  });

  test("[TXT-11] purpose and guests are described only by their placeholders", async ({ page }) => {
    await open(page);
    for (const ph of [PURPOSE, GUESTS]) {
      const field = page.getByPlaceholder(ph, { exact: true });
      await expect(field).toHaveCount(1);
      await expect(page.getByLabel(ph)).toHaveCount(0);
      const id = (await field.getAttribute("id"))!;
      await expect(page.locator(`label[for="${id}"]`)).toHaveCount(0);
      for (const attr of ["name", "aria-label", "aria-labelledby", "title"]) expect(await field.getAttribute(attr)).toBeNull();
      // The accessible name falls back to the placeholder, so the role locator finds it.
      await expect(page.getByRole(ph === GUESTS ? "spinbutton" : "textbox", { name: ph })).toHaveCount(1);
    }
    const purpose = page.getByPlaceholder(PURPOSE);
    expect(await purpose.evaluate((el) => el.matches(":placeholder-shown"))).toBe(true);
    await purpose.fill("ab");
    expect(await purpose.evaluate((el) => el.matches(":placeholder-shown"))).toBe(false);
    await page.getByPlaceholder(GUESTS).fill("301");
    await page.getByRole("button", { name: "Review and book" }).click();
    const summary = page.getByRole("alert").filter({ hasText: "Please correct the following:" });
    await expect(summary).toContainText("Enter the purpose of the booking (at least 5 characters).");
    await expect(summary).toContainText("This venue can hold at most 300 guests.");
    await expect(purpose).toHaveAttribute("aria-invalid", "true");
  });

  test("[TXT-11] the placeholder text follows the language, so a text locator breaks in Tamil", async ({ page, context }) => {
    await context.addCookies([{ name: "amc_lang", value: "ta", url: "http://localhost:3100" }]);
    await page.goto(URL);
    await expect(page.getByLabel("அரங்கம்", { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder(PURPOSE)).toHaveCount(0);
    await expect(page.getByPlaceholder("முன்பதிவின் நோக்கம் (எ.கா. திருமண வரவேற்பு)")).toHaveCount(1);
  });

  test("[DLG-06] the confirmation is a native modal <dialog>; Escape and Go back book nothing", async ({ page }) => {
    const seen: string[] = [];
    page.on("dialog", (d) => { seen.push(d.type()); void d.dismiss(); });
    const { first, free } = await open(page);
    const dlg = page.locator("dialog");
    await expect(dlg).toHaveCount(1); // in the DOM from the start, closed
    await expect(confirmDialog(page)).toBeHidden();
    expect(await dlg.getAttribute("open")).toBeNull();

    await pickDate(page, first);
    await slotMap(page).getByRole("checkbox", { name: `${slotLabel(free[0])}, available` }).click();
    await fillEvent(page);
    await page.getByRole("button", { name: "Review and book" }).click();
    await expect(confirmDialog(page)).toBeVisible();
    expect(await dlg.evaluate((d: HTMLDialogElement) => [d.open, d.matches(":modal")])).toEqual([true, true]);
    await expect(confirmDialog(page)).toContainText(ddmmyyyy(first));
    // The page behind is inert while the dialog is open.
    await expect(page.getByRole("button", { name: "Review and book" }).click({ timeout: 1000 })).rejects.toThrow();

    await page.keyboard.press("Escape");
    await expect(confirmDialog(page)).toBeHidden();
    expect(await dlg.evaluate((d: HTMLDialogElement) => d.returnValue)).toBe("");

    await page.getByRole("button", { name: "Review and book" }).click();
    await confirmDialog(page).getByRole("button", { name: "Go back" }).click();
    await expect(confirmDialog(page)).toBeHidden();
    expect(await dlg.evaluate((d: HTMLDialogElement) => d.returnValue)).toBe("back");
    expect(await page.evaluate(() => localStorage.getItem("amc.applications"))).toBeNull();
    expect(seen).toEqual([]);
  });

  test("[DLG-06][OTH-21][CHK-07][DAT-02] confirming saves the booking and blocks its slot", async ({ page, context }) => {
    await mockDelays(context, { delays: { BOOKING_SLOTS: 300, BOOKING_SUBMIT: 800 } });
    const { first, free } = await open(page);
    await pickDate(page, first);
    const slot = free[0];
    await slotMap(page).getByRole("checkbox", { name: `${slotLabel(slot)}, available` }).click();
    await tile(page, "Public address system").click();
    await fillEvent(page);
    await page.getByRole("button", { name: "Review and book" }).click();
    await confirmDialog(page).getByRole("button", { name: "Confirm booking" }).click();
    await expect(confirmDialog(page)).toBeHidden();
    expect(await page.locator("dialog").evaluate((d: HTMLDialogElement) => d.returnValue)).toBe("confirm");
    await expect(page.getByRole("button", { name: "Booking…" })).toBeDisabled();
    await expect(page.getByRole("heading", { name: "Booking confirmed" })).toBeVisible();

    const ref = (await page.locator("output").filter({ hasText: /^AMC\/BK\// }).textContent())!;
    expect(ref).toMatch(/^AMC\/BK\/\d{4}\/\d{6}$/);
    const apps = JSON.parse((await page.evaluate(() => localStorage.getItem("amc.applications")))!);
    expect(apps[0]).toMatchObject({
      ref, service: "booking", status: "Submitted", amount: 2 * 600 + 750 + 5000,
      details: { venue: "V01", date: first, slots: String(slot), amenities: "sound", attendees: "120", purpose: "Family get-together" },
    });

    // Book again: the same slot on that day is now booked.
    await page.getByRole("button", { name: "Make another booking" }).click();
    await page.getByLabel("Venue", { exact: true }).selectOption({ label: VENUE_NAME });
    await pickDate(page, first);
    await expect(slotMap(page).getByRole("checkbox", { name: `${slotLabel(slot)}, booked` })).toHaveAttribute("aria-disabled", "true");
  });

  test("[DLG-06] a failed booking shows an error and saves nothing", async ({ page, context }) => {
    await mockDelays(context, { delays: { BOOKING_SLOTS: 300, BOOKING_SUBMIT: 300 }, fail: ["BOOKING_SUBMIT"] });
    const { first, free } = await open(page);
    await pickDate(page, first);
    await slotMap(page).getByRole("checkbox", { name: `${slotLabel(free[0])}, available` }).click();
    await fillEvent(page);
    await page.getByRole("button", { name: "Review and book" }).click();
    await confirmDialog(page).getByRole("button", { name: "Confirm booking" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "The booking could not be completed." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Review and book" })).toBeEnabled();
    await expect(page.getByRole("heading", { name: "Booking confirmed" })).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem("amc.applications"))).toBeNull();
  });

  test("[DLG-06] with every delay scaled to 0 the booking still goes through", async ({ page, context }) => {
    await mockDelays(context, { scale: 0 });
    const { first, free } = await open(page);
    await pickDate(page, first);
    await slotMap(page).getByRole("checkbox", { name: `${slotLabel(free[0])}, available` }).click();
    await fillEvent(page);
    await page.getByRole("button", { name: "Review and book" }).click();
    await confirmDialog(page).getByRole("button", { name: "Confirm booking" }).click();
    await expect(page.getByRole("heading", { name: "Booking confirmed" })).toBeVisible();
  });

  test("[DYN-06] ids change on every load and classes are build hashes; labels stay", async ({ page }) => {
    const grab = async () => {
      await page.goto(URL);
      const venue = page.getByLabel("Venue", { exact: true });
      await venue.selectOption({ label: VENUE_NAME });
      return {
        venue: (await venue.getAttribute("id"))!,
        purpose: (await page.getByPlaceholder(PURPOSE).getAttribute("id"))!,
        tile: (await tile(page, "Generator backup").getAttribute("class"))!,
      };
    };
    const a = await grab();
    const b = await grab();
    expect(a.venue).toMatch(/^[a-z][a-z0-9]{7,}$/);
    expect(a.venue).not.toBe(b.venue);
    expect(a.purpose).not.toBe(b.purpose);
    // No shared readable part either: the two loads' ids have different prefixes.
    expect(a.venue.slice(0, 7)).not.toBe(b.venue.slice(0, 7));
    // A CSS-module class: build hash + "_" + local name, never the bare name.
    expect(a.tile).toMatch(/^\S+_tile$/);
    expect(a.tile.split(" ")).not.toContain("tile");
    await expect(page.locator("#" + a.venue)).toHaveCount(0);
    await expect(page.getByLabel("Venue", { exact: true })).toHaveValue("V01");
  });
});
