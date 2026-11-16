import type { Page } from "@playwright/test";
import { test, expect, mockDelays, seedSession } from "./fixtures";
import { addDays, formatDate, todayISO } from "../src/lib/format";
import { firstAvailable, monthOf, unavailableReason } from "../src/modules/grievance/tracking";
import { calendarDays, monthsBetween } from "./inspection-dates";

const URL = "/grievances/track";
/** Lookups and updates instant; automatic checks far apart so they don't interfere. */
const FAST = { GRIEVANCE_LOOKUP: 0, GRIEVANCE_UPDATE: 0, GRIEVANCE_STATUS: 0, GRIEVANCE_POLL: 60_000 };

const INSPECTION = "AMC/GR/2026/004612"; // seeded: inspection scheduled
const RESOLVED = "AMC/GR/2026/004598"; // seeded: resolved, not rated
const NEW = "AMC/GR/2026/004655"; // seeded: submitted

const refField = (page: Page) => page.getByLabel("Grievance number");
const status = (page: Page) => page.locator("#gt-status");

async function track(page: Page, ref: string) {
  await refField(page).fill(ref);
  await page.getByRole("button", { name: "Track", exact: true }).click();
  await expect(page.getByRole("heading", { name: `Grievance ${ref}` })).toBeVisible();
}

const longDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
};

test.describe("Grievance tracking", () => {
  test.beforeEach(async ({ context }) => {
    await mockDelays(context, { delays: FAST });
  });

  test("[TXT-05] the grievance number only reaches the app through real input events", async ({ page }) => {
    await page.goto(URL);
    const field = refField(page);
    const trackBtn = page.getByRole("button", { name: "Track", exact: true });
    const error = page.locator("#gt-ref-error");
    await expect(field).toBeEditable();

    // Setting .value from a script: the field shows it, but React state is still empty.
    await field.evaluate((el: HTMLInputElement, v) => { el.value = v; }, INSPECTION);
    await expect(field).toHaveValue(INSPECTION);
    await trackBtn.click();
    await expect(error).toHaveText("Enter your grievance number.");
    await expect(field).toHaveValue(""); // the re-render puts the state's value back
    await expect(status(page)).toHaveCount(0);

    // Even followed by an input event: React's value tracker already holds the new value, so no change is seen.
    await field.evaluate((el: HTMLInputElement, v) => { el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); }, INSPECTION);
    await trackBtn.click();
    await expect(error).toHaveText("Enter your grievance number.");
    await expect(field).toHaveValue("");

    // The prototype's value setter + an input event does reach React.
    await field.evaluate((el: HTMLInputElement, v) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, INSPECTION);
    await trackBtn.click();
    await expect(status(page)).toHaveText("Inspection scheduled");

    // Typing is normalised by the state: upper case, no spaces.
    await field.fill("");
    await field.pressSequentially("amc/gr/2026/ 004598");
    await expect(field).toHaveValue(RESOLVED);

    // Messages carry their values.
    await field.fill("AMC/GR/2026/999999");
    await trackBtn.click();
    await expect(error).toHaveText("No grievance was found with the number AMC/GR/2026/999999. Check the number and try again.");
    await field.fill("12345");
    await trackBtn.click();
    await expect(error).toContainText("Enter the grievance number as shown on your acknowledgement");
  });

  test("[TXT-05] Track waits for the lookup", async ({ page, context }) => {
    await mockDelays(context, { delays: { ...FAST, GRIEVANCE_LOOKUP: 800 } });
    await page.goto(URL);
    await refField(page).fill(RESOLVED);
    await page.getByRole("button", { name: "Track", exact: true }).click();
    await expect(page.getByRole("button", { name: "Searching…" })).toBeDisabled();
    await expect(status(page)).toHaveText("Resolved");
  });

  test("[DYN-05] the status changes in place on the default 5-second checks", async ({ page, context }) => {
    test.setTimeout(30_000);
    await mockDelays(context, { delays: { GRIEVANCE_LOOKUP: 0 } }); // real GRIEVANCE_POLL (5s) and GRIEVANCE_STATUS (0.6s)
    await page.goto(URL);
    await track(page, NEW);
    await expect(status(page)).toHaveText("Submitted");
    await expect(page.getByText(/^Status checked at \d\d:\d\d:\d\d$/)).toBeVisible();
    // Longer than this suite's default expect timeout (7s) would allow for two checks.
    await page.waitForTimeout(3_000);
    await expect(status(page)).toHaveText("Submitted");
    await expect(page.getByText("Checking for updates…")).toBeVisible({ timeout: 4_000 });
    await expect(status(page)).toHaveText("Assigned to ward engineer", { timeout: 6_000 });
  });

  test("[DYN-05] a new grievance moves on to inspection scheduled, then checks keep running", async ({ page, context }) => {
    await mockDelays(context, { delays: { ...FAST, GRIEVANCE_POLL: 400, GRIEVANCE_STATUS: 200 } });
    await page.goto(URL);
    await track(page, NEW);
    const reschedule = page.getByRole("button", { name: "Reschedule inspection" });
    await expect(reschedule).toHaveCount(0);
    await expect(status(page)).toHaveText("Assigned to ward engineer");
    await expect(status(page)).toHaveText("Inspection scheduled");
    await expect(reschedule).toBeVisible();
    const inspection = firstAvailable(addDays(todayISO(), 2), todayISO())!;
    await expect(page.locator("#gt-inspection")).toContainText(formatDate(inspection));
    await expect(page.getByRole("listitem").filter({ hasText: "Assigned to ward engineer" })).toContainText("Assistant Engineer, Zone 2");
    // The stage is kept: tracking again later shows it straight away.
    const progress = JSON.parse((await page.evaluate(() => localStorage.getItem("amc.grievanceProgress")))!);
    expect(progress[NEW].stage).toBe(2);
    await page.reload();
    await track(page, NEW);
    await expect(status(page)).toHaveText("Inspection scheduled");
  });

  test("[DYN-05] a resolved grievance is not checked again", async ({ page, context }) => {
    await mockDelays(context, { delays: { ...FAST, GRIEVANCE_POLL: 200 } });
    await page.goto(URL);
    await track(page, RESOLVED);
    await expect(status(page)).toHaveText("Resolved");
    await page.waitForTimeout(800);
    await expect(page.getByText(/Status checked at|Checking for updates/)).toHaveCount(0);
  });

  test("[DLG-16] print acknowledgement calls window.print and prints only the acknowledgement", async ({ page, context }) => {
    // Unstubbed, headless Chromium returns from window.print() at once.
    await page.goto(URL);
    let dialogs = 0;
    page.on("dialog", () => { dialogs++; });
    const ms = await page.evaluate(() => { const t = performance.now(); window.print(); return performance.now() - t; });
    expect(ms).toBeLessThan(1_000);
    expect(dialogs).toBe(0); // not an alert/confirm/prompt: no dialog event

    await context.addInitScript(() => {
      (window as unknown as { __prints: number }).__prints = 0;
      window.print = () => { (window as unknown as { __prints: number }).__prints++; };
    });
    await page.reload();
    await track(page, INSPECTION);
    const card = page.locator("section").filter({ has: page.getByRole("heading", { name: `Grievance ${INSPECTION}` }) });
    await expect(page.getByText("Grievance acknowledgement")).toBeHidden();
    await page.getByRole("button", { name: "Print acknowledgement" }).click();
    expect(await page.evaluate(() => (window as unknown as { __prints: number }).__prints)).toBe(1);

    await page.emulateMedia({ media: "print" });
    await expect(page.getByText("Grievance acknowledgement")).toBeVisible();
    await expect(page.getByText(/^Printed on \d\d\/\d\d\/\d{4} \d\d:\d\d$/)).toBeVisible();
    await expect(card.getByText("Inspection scheduled").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Print acknowledgement" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Reschedule inspection" })).toBeHidden();
    await expect(page.getByRole("heading", { name: "Find your grievance" })).toBeHidden();
    await expect(page.getByRole("banner")).toBeHidden();
    await page.emulateMedia({ media: "screen" });
    await expect(page.getByText("Grievance acknowledgement")).toBeHidden();
  });

  test("[TBL-07] My grievances keeps its header on top inside its own scroll box", async ({ page, context }) => {
    await page.goto(URL);
    await expect(page.getByText("Sign in to see all the grievances you have registered.")).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);

    await seedSession(context, "meena");
    await page.reload();
    const box = page.getByRole("region", { name: "My grievances" });
    const table = box.getByRole("table");
    await expect(table.getByRole("row")).toHaveCount(15); // header + 14 grievances
    expect(await box.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    const header = table.getByRole("columnheader", { name: "Grievance number" });
    expect(await header.evaluate((el) => getComputedStyle(el).position)).toBe("sticky");

    // Scroll the box so that the 6th grievance's View button passes under the header: the button is
    // still inside the box and the viewport, but its centre point now hits a header cell.
    const view = table.getByRole("row").nth(6).getByRole("button", { name: /^View / });
    await box.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await view.evaluate((btn) => {
      const box = btn.closest("[role=region]")!;
      const head = box.querySelector("thead")!.getBoundingClientRect();
      const r = btn.getBoundingClientRect();
      box.scrollTop += r.top + r.height / 2 - (head.top + head.height / 2);
    });
    const b = (await box.boundingBox())!;
    const h = (await header.boundingBox())!;
    expect(Math.abs(h.y - b.y)).toBeLessThan(2); // header still at the top of the box
    const hit = await view.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { inHeader: !!top?.closest("thead"), isButton: top === el, inViewport: r.top >= 0 && r.bottom <= innerHeight };
    });
    expect(hit).toEqual({ inHeader: true, isButton: false, inViewport: true });

    // A real click on the last row's button works once it is scrolled into view (Playwright does that).
    const last = table.getByRole("row").last();
    const ref = (await last.getByRole("cell").first().textContent())!;
    await last.getByRole("button", { name: `View ${ref}` }).click();
    await expect(page.getByRole("heading", { name: `Grievance ${ref}` })).toBeVisible();
    await expect(refField(page)).toHaveValue(ref);
  });

  test("[DAT-06] unavailable dates are aria-disabled grid cells, and the grid works by keyboard", async ({ page }) => {
    const today = todayISO();
    const days = calendarDays(today);
    expect(days, `no available inspection day after ${today}`).not.toBeNull();
    const { first, current, off, outside, target } = days!;
    await page.goto(URL);
    await track(page, INSPECTION);
    await page.getByRole("button", { name: "Reschedule inspection" }).click();
    const grid = page.getByRole("grid");
    await expect(grid.locator("button, input:not([type=hidden])")).toHaveCount(0);
    const cell = (iso: string) => grid.getByRole("gridcell", { name: longDate(iso), exact: true });
    const note = (iso: string) => page.getByText(new RegExp(`^${formatDate(iso)} is (not )?available`));

    // Focus lands on the first available day as soon as the calendar opens, in that day's month.
    await expect(cell(first)).toBeFocused();
    await expect(grid.locator("[tabindex='0']")).toHaveCount(1);
    let shown = monthOf(first);
    const showMonth = async (iso: string) => {
      const n = monthsBetween(shown, monthOf(iso));
      const button = page.getByRole("button", { name: n > 0 ? "Next month" : "Previous month" });
      for (let i = 0; i < Math.abs(n); i++) await button.click();
      shown = monthOf(iso);
      await expect(cell(iso)).toBeVisible();
    };

    // An unavailable day in the window: a plain <td> with aria-disabled, no disabled property.
    expect(off, "every day of the booking window is available").not.toBeNull();
    await showMonth(off!);
    const offCell = cell(off!);
    await expect(offCell).toHaveAttribute("aria-disabled", "true");
    expect(await offCell.evaluate((el) => [el.tagName, "disabled" in el, el.hasAttribute("disabled")])).toEqual(["TD", false, false]);
    await expect(offCell).toBeDisabled(); // Playwright reads aria-disabled
    await offCell.click({ force: true });
    await expect(page.locator("#gt-new-date")).toHaveText("None chosen");
    await expect(page.locator("input[name=inspectionDate]")).toHaveValue("");
    const reason = unavailableReason(off!, today)!;
    await expect(note(off!)).toContainText(`${formatDate(off!)} is not available:`);
    if (reason.kind === "sunday") await expect(note(off!)).toHaveText(`${formatDate(off!)} is not available: Sunday.`);

    // A day outside the window explains itself too (not some other day). There is no such day in the
    // months on show when the window covers whole months, e.g. today = 31 March.
    if (outside) {
      await showMonth(outside);
      await cell(outside).click({ force: true });
      await expect(note(outside)).toHaveText(`${formatDate(outside)} is not available: outside the booking period.`);
      await expect(page.locator("#gt-new-date")).toHaveText("None chosen");
    }

    // Keyboard: walk with arrow keys from the first day to an available day other than the current one.
    expect(target, `no second available day after ${first} other than ${current}`).not.toBeNull();
    await showMonth(first);
    await cell(first).focus();
    const steps = Math.round((new Date(target!).getTime() - new Date(first).getTime()) / 86_400_000);
    for (let i = 0; i < steps; i++) await page.keyboard.press("ArrowRight");
    await expect(cell(target!)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#gt-new-date")).toHaveText(formatDate(target!));
    await expect(page.locator("input[name=inspectionDate]")).toHaveValue(target!);
    await expect(cell(target!)).toHaveAttribute("aria-selected", "true");

    await page.getByRole("button", { name: "Confirm new date" }).click();
    await expect(page.getByText(`The site inspection has been moved to ${formatDate(target!)} at 11:00 AM.`)).toBeVisible();
    await expect(page.locator("#gt-inspection")).toHaveText(`${formatDate(target!)} at 11:00 AM`);
    await expect(grid).toHaveCount(0);
  });

  test("[OTH-09] star rating: role=radio stars, hover only previews, keyboard from the first star", async ({ page }) => {
    await page.goto(URL);
    await track(page, RESOLVED);
    const group = page.getByRole("radiogroup", { name: "Your rating" });
    const stars = group.getByRole("radio");
    await expect(stars).toHaveCount(5);
    await expect(page.locator("input[type=radio]")).toHaveCount(0);
    await expect(group.locator("[tabindex='0']")).toHaveCount(1);
    await expect(stars.first()).toHaveAttribute("tabindex", "0");

    await page.getByRole("button", { name: "Submit feedback" }).click();
    await expect(page.getByText("Choose a rating from 1 to 5 stars.")).toBeVisible();

    // Hover fills stars but chooses nothing.
    const five = group.getByRole("radio", { name: "5 out of 5 stars" });
    await five.hover();
    await expect(five.locator("svg")).toHaveAttribute("fill", "currentColor");
    await expect(group.locator("[aria-checked=true]")).toHaveCount(0);
    await expect(page.locator("input[name=rating]")).toHaveValue("");
    await page.mouse.move(0, 0);
    await expect(five.locator("svg")).toHaveAttribute("fill", "none");

    // Keyboard: the first star is the tab stop; arrows move and choose.
    await stars.first().focus();
    await page.keyboard.press("Space");
    await expect(stars.first()).toHaveAttribute("aria-checked", "true");
    for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
    const four = group.getByRole("radio", { name: "4 out of 5 stars" });
    await expect(four).toBeFocused();
    await expect(four).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("input[name=rating]")).toHaveValue("4");

    await group.getByRole("radio", { name: "3 out of 5 stars" }).click();
    await expect(group.locator("[aria-checked=true]")).toHaveCount(1);
    await expect(page.locator("input[name=rating]")).toHaveValue("3");
    await page.getByLabel("Comments (optional)").fill("Lights repaired within two days.");
    await page.getByRole("button", { name: "Submit feedback" }).click();
    await expect(page.getByText("Thank you for your feedback.")).toBeVisible();
    await expect(page.locator("#gt-your-rating")).toHaveText("Your rating: 3 out of 5 stars");
    const progress = JSON.parse((await page.evaluate(() => localStorage.getItem("amc.grievanceProgress")))!);
    expect(progress[RESOLVED]).toMatchObject({ rating: 3, comment: "Lights repaired within two days." });
  });

  test("[TXT-05][DYN-05] a grievance registered here can be tracked from its acknowledgement", async ({ page, context }) => {
    await mockDelays(context, { delays: { ...FAST, GRIEVANCE_SUBMIT: 0 } });
    await page.goto("/grievances/new");
    await page.locator("#gr-category").click();
    await page.getByRole("option", { name: "Garbage not collected" }).click();
    await page.getByRole("button", { name: "Ward 14 – Kalaivani Nagar" }).click();
    await page.getByRole("textbox", { name: "Describe the problem" }).fill("Garbage bin overflowing near the ration shop for three days.");
    await page.locator("#gr-time").click();
    await page.getByRole("option", { name: "10 AM" }).click();
    await page.getByRole("option", { name: "30", exact: true }).click();
    await page.getByLabel("Your name").fill("Meena Rajendran");
    await page.getByLabel("Mobile number").fill("9841023456");
    await page.getByRole("button", { name: "Submit grievance" }).click();
    const ref = (await page.locator("#gr-ref").textContent())!;
    await page.getByRole("main").getByRole("link", { name: "Track grievance", exact: true }).click();
    await expect(page).toHaveURL(/\/grievances\/track$/);
    await track(page, ref);
    await expect(status(page)).toHaveText("Submitted");
    await expect(page.getByText("Garbage bin overflowing near the ration shop for three days.")).toBeVisible();
  });
});
