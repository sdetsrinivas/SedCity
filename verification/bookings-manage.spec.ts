import type { Page } from "@playwright/test";
import { test, expect, mockDelays, seedSession } from "./fixtures";
import { moveCase } from "./booking-moves";
import { hhmm } from "../src/modules/bookings/booking";
import { movedBooking, sortBookings } from "../src/modules/bookings/manage";

const URL = "/bookings";
const VENUE = "Lake Road Kalyana Mandapam";

/** Local ISO date in the browser (the page and the seeded bookings use the same clock). */
const browserToday = (page: Page) =>
  page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
const ddmmyyyy = (iso: string) => iso.split("-").reverse().join("/");
const timeFrom = (hour: number) => `${hhmm(hour)} – ${hhmm(hour + 4)}`; // the moved booking is two slots long

const mine = (page: Page) => page.getByRole("region", { name: "My bookings" });
const rowOf = (page: Page, ref: string) => mine(page).getByRole("row").filter({ has: page.getByRole("rowheader", { name: ref, exact: true }) });
const board = (page: Page) => page.getByRole("region", { name: /^Availability for the week of/ });
const storedDate = (page: Page, ref: string) =>
  page.evaluate((r) => JSON.parse(localStorage.getItem("amc.applications") ?? "[]").find((a: { ref: string }) => a.ref === r)?.details.date ?? null, ref);

/** Open /bookings, work out the move case for the browser's today and open the board for the booking. */
async function openBoard(page: Page) {
  await page.goto(URL);
  const c = moveCase(await browserToday(page));
  await rowOf(page, c.booking.ref).getByRole("button", { name: "Move" }).click();
  await expect(board(page)).toBeVisible();
  const chip = page.getByRole("button", { name: new RegExp(`^${c.booking.ref}`) });
  /** A board cell: the row by its time header, the column by the day's position in the week. */
  const cell = (at: { date: string; hour: number }) => {
    const col = Math.round((Date.parse(`${at.date}T12:00:00`) - Date.parse(`${c.monday}T12:00:00`)) / 864e5);
    return board(page).getByRole("row").filter({ has: page.getByRole("rowheader", { name: new RegExp(`^${hhmm(at.hour)} – `) }) }).getByRole("cell").nth(col);
  };
  const start = { date: c.booking.details.date, hour: Number(c.booking.details.slots.split(",")[0]) };
  return { c, chip, cell, start };
}

test.describe("My bookings and moving a booking", () => {
  test.beforeEach(async ({ context }) => {
    await seedSession(context);
    await mockDelays(context, { delays: { MY_BOOKINGS: 300, BOOKING_WEEK: 300, BOOKING_MOVE: 600, BOOKING_SLOTS: 300 } });
  });

  test("[TBL-08] rows repeat venue, date and time; only the booking number tells them apart", async ({ page, context }) => {
    await mockDelays(context, { delays: { MY_BOOKINGS: 800 } });
    await page.goto(URL);
    await expect(mine(page).getByText("Loading your bookings…")).toBeVisible();
    const c = moveCase(await browserToday(page));
    await expect(mine(page).getByRole("rowheader")).toHaveText(c.mine.map((a) => a.ref));

    // Two rows have the same venue, date and time: a locator by that text is ambiguous.
    const same = mine(page).getByRole("row").filter({ hasText: VENUE }).filter({ hasText: ddmmyyyy(c.booking.details.date) });
    await expect(same).toHaveCount(2);
    await expect(same.getByText(timeFrom(Number(c.booking.details.slots.split(",")[0])), { exact: true })).toHaveCount(2);
    await expect(same.textContent({ timeout: 1000 })).rejects.toThrow(/strict mode violation/);
    // The first of them is the lapsed booking, which cannot be moved.
    await expect(same.first().getByText("Lapsed")).toBeVisible();
    await expect(same.first().getByRole("button")).toHaveCount(0);
    // Every movable row has the same button name; the row header (booking number) picks the right one.
    await expect(mine(page).getByRole("button", { name: "Move", exact: true })).toHaveCount(4);
    await expect(rowOf(page, c.booking.ref).getByRole("button", { name: "Move" })).toHaveCount(1);
    await expect(rowOf(page, c.booking.ref)).toContainText("Awaiting payment");
  });

  test("[TBL-08] at 390px the rows are stacked, with no horizontal page scroll", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(URL);
    const c = moveCase(await browserToday(page));
    const row = rowOf(page, c.booking.ref);
    await expect(row).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    const move = row.getByRole("button", { name: "Move" });
    const box = (await move.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    await move.click();
    await expect(board(page)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });

  test("[OTH-03][TBL-08] dragging the booking to a free time rewrites the same record and re-sorts the table", async ({ page }) => {
    const { c, chip, cell, start } = await openBoard(page);
    const t = c.target!;
    await expect(chip).toHaveAttribute("draggable", "true");
    await expect(cell(start)).toHaveText("Your booking");
    await chip.dragTo(cell(t));
    await expect(page.getByText("Moving your booking…")).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: `Booking ${c.booking.ref} has been moved to ${ddmmyyyy(t.date)}, ${timeFrom(t.hour)}.` })).toBeVisible();
    await expect(cell(t)).toHaveText("Your booking");
    if (t.date !== start.date) await expect(cell(start)).not.toHaveText("Your booking");

    // The same booking number now has the new day and time, and the rows are in date order again.
    const row = rowOf(page, c.booking.ref);
    await expect(row).toContainText(ddmmyyyy(t.date));
    await expect(row).toContainText(timeFrom(t.hour));
    const moved = movedBooking(c.booking, c.venue, t.date, t.hour, "");
    const order = sortBookings(c.mine.map((a) => (a.ref === moved.ref ? moved : a))).map((a) => a.ref);
    await expect(mine(page).getByRole("rowheader")).toHaveText(order);
    expect(await storedDate(page, c.booking.ref)).toBe(t.date);
    const apps = JSON.parse((await page.evaluate(() => localStorage.getItem("amc.applications")))!);
    expect(apps).toHaveLength(1);
    expect(apps[0]).toMatchObject({ ref: c.booking.ref, amount: c.booking.amount, details: { slots: `${t.hour},${t.hour + 2}`, start: hhmm(t.hour), end: hhmm(t.hour + 4), hours: "4" } });

    // After a reload the table still shows the moved booking.
    await page.reload();
    await expect(rowOf(page, c.booking.ref)).toContainText(ddmmyyyy(t.date));
  });

  test("[OTH-03] synthetic events: a drop without the booking number does nothing; a DataTransfer carrying it moves the booking", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const { c, chip, cell } = await openBoard(page);
    const t = c.target!;
    // dispatchEvent('dragstart' / 'drop') without a dataTransfer creates a DragEvent whose dataTransfer is null.
    await chip.dispatchEvent("dragstart");
    await cell(t).dispatchEvent("drop");
    // Synthetic mouse events never start a native drag.
    await chip.evaluate((el) => { for (const type of ["mousedown", "mousemove"]) el.dispatchEvent(new MouseEvent(type, { bubbles: true })); });
    await cell(t).evaluate((el) => { for (const type of ["mousemove", "mouseup"]) el.dispatchEvent(new MouseEvent(type, { bubbles: true })); });
    await expect(page.getByText("Moving your booking…")).toHaveCount(0);
    expect(await storedDate(page, c.booking.ref)).toBeNull();

    // A drop event with a real DataTransfer holding the booking number (text/plain) is what the page reads.
    const dt = await page.evaluateHandle((ref) => { const d = new DataTransfer(); d.setData("text/plain", ref); return d; }, c.booking.ref);
    await cell(t).dispatchEvent("drop", { dataTransfer: dt });
    await expect(page.getByRole("status").filter({ hasText: `has been moved to ${ddmmyyyy(t.date)}, ${timeFrom(t.hour)}.` })).toBeVisible();
    await expect.poll(() => storedDate(page, c.booking.ref)).toBe(t.date);
    expect(errors).toEqual([]);
  });

  test("[OTH-03] Playwright's low-level mouse also drags natively in Chromium", async ({ page }) => {
    const { c, chip, cell } = await openBoard(page);
    const t = c.target!;
    await chip.hover();
    await page.mouse.down();
    await cell(t).hover();
    await page.mouse.up();
    await expect.poll(() => storedDate(page, c.booking.ref)).toBe(t.date);
  });

  test("[OTH-03] a drop on a booked slot or a closed day shows why and leaves the booking where it was", async ({ page }) => {
    const { c, chip, cell, start } = await openBoard(page);
    const taken = c.taken!;
    await chip.dragTo(cell(taken));
    await expect(page.getByRole("alert").filter({ hasText: `${ddmmyyyy(taken.date)}, ${timeFrom(taken.hour)} is not free. Your booking has not been moved.` })).toBeVisible();
    const closed = c.closed!;
    await chip.dragTo(cell(closed));
    await expect(page.getByRole("alert").filter({ hasText: `The venue is closed on ${ddmmyyyy(closed.date)}. Your booking has not been moved.` })).toBeVisible();
    await expect(page.getByText("Moving your booking…")).toHaveCount(0);
    await expect(page.getByText(/has been moved/)).toHaveCount(0);
    await expect(cell(start)).toHaveText("Your booking");
    expect(await storedDate(page, c.booking.ref)).toBeNull();
    await expect(rowOf(page, c.booking.ref)).toContainText(ddmmyyyy(start.date));
  });

  test("[OTH-03] when the move fails the booking is unchanged and only an error remains", async ({ page, context }) => {
    await mockDelays(context, { delays: { MY_BOOKINGS: 300, BOOKING_WEEK: 300, BOOKING_MOVE: 300 }, fail: ["BOOKING_MOVE"] });
    const { c, chip, cell, start } = await openBoard(page);
    await chip.dragTo(cell(c.target!));
    await expect(page.getByRole("alert").filter({ hasText: "Your booking could not be moved right now." })).toBeVisible();
    await expect(page.getByText("Moving your booking…")).toHaveCount(0);
    await expect(page.getByText(/has been moved/)).toHaveCount(0);
    await expect(cell(start)).toHaveText("Your booking");
    await expect(cell(c.target!)).not.toHaveText("Your booking");
    expect(await storedDate(page, c.booking.ref)).toBeNull();
    await expect(rowOf(page, c.booking.ref)).toContainText(ddmmyyyy(start.date));
  });

  test("[OTH-03] a slot booked elsewhere in the meantime is refused by the move itself", async ({ page }) => {
    const { c, chip, cell } = await openBoard(page);
    const t = c.target!;
    // Another tab books the target slot after the board was loaded.
    await page.evaluate(({ venue, date, hour }) => {
      const apps = JSON.parse(localStorage.getItem("amc.applications") ?? "[]");
      apps.unshift({ ref: "AMC/BK/2026/009999", service: "booking", title: "x", submittedAt: new Date().toISOString(), status: "Submitted", details: { venue, date, slots: String(hour), mobile: "9000000000" } });
      localStorage.setItem("amc.applications", JSON.stringify(apps));
    }, { venue: c.venue.id, date: t.date, hour: t.hour });
    await chip.dragTo(cell(t));
    await expect(page.getByRole("alert").filter({ hasText: `${ddmmyyyy(t.date)}, ${timeFrom(t.hour)} is not free.` })).toBeVisible();
    expect(await storedDate(page, c.booking.ref)).toBeNull();
    await expect(cell(t)).toHaveText("Booked"); // the board was loaded again
  });

  test("[OTH-03] keyboard: Space picks the booking up, the arrow keys choose a time, Space moves it", async ({ page }) => {
    const { c, chip, start } = await openBoard(page);
    const t = c.target!;
    await expect(chip).toBeFocused();
    await page.keyboard.press("Space");
    await expect(chip).toHaveAttribute("aria-pressed", "true");
    const days = Math.round((Date.parse(`${t.date}T12:00:00`) - Date.parse(`${start.date}T12:00:00`)) / 864e5);
    for (let i = 0; i < Math.abs(days); i++) await page.keyboard.press(days < 0 ? "ArrowLeft" : "ArrowRight");
    const steps = (t.hour - start.hour) / 2;
    for (let i = 0; i < Math.abs(steps); i++) await page.keyboard.press(steps < 0 ? "ArrowUp" : "ArrowDown");
    await expect(page.getByText(`${ddmmyyyy(t.date)}, ${timeFrom(t.hour)}: free`)).toBeVisible();
    await page.keyboard.press("Space");
    await expect(page.getByRole("status").filter({ hasText: `has been moved to ${ddmmyyyy(t.date)}, ${timeFrom(t.hour)}.` })).toBeVisible();
    expect(await storedDate(page, c.booking.ref)).toBe(t.date);

    // Escape puts a picked-up booking back without moving it.
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Escape");
    await expect(page.getByText("Move cancelled. The booking is unchanged.")).toBeVisible();
    expect(await storedDate(page, c.booking.ref)).toBe(t.date);
  });

  test("[OTH-03] with every delay scaled to 0 the move still goes through", async ({ page, context }) => {
    await mockDelays(context, { scale: 0 });
    const { c, chip, cell } = await openBoard(page);
    await chip.dragTo(cell(c.target!));
    await expect.poll(() => storedDate(page, c.booking.ref)).toBe(c.target!.date);
  });

  for (const day of ["2026-12-31", "2027-01-30", "2027-02-27", "2028-02-28"]) {
    test(`[OTH-03][TBL-08] with today pinned to ${day} the table and the move still line up`, async ({ page }) => {
      await page.clock.setFixedTime(new Date(`${day}T10:00:00`));
      const { c, chip, cell } = await openBoard(page);
      expect(await browserToday(page)).toBe(day);
      await expect(mine(page).getByRole("rowheader")).toHaveText(c.mine.map((a) => a.ref));
      await chip.dragTo(cell(c.target!));
      await expect(page.getByRole("status").filter({ hasText: `has been moved to ${ddmmyyyy(c.target!.date)}, ${timeFrom(c.target!.hour)}.` })).toBeVisible();
      expect(await storedDate(page, c.booking.ref)).toBe(c.target!.date);
    });
  }
});
