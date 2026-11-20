import type { Locator, Page } from "@playwright/test";
import { test, expect, mockDelays, seedSession, USERS } from "./fixtures";
import {
  CHART, barBoxes, inRange, monthlyTotals, presetRange, seededPayments, serviceTotals, type Payment, type Range,
} from "../src/modules/dashboard/data";

const URL = "/dashboard";
/** Every check runs at a fixed moment (Date only; timers run normally) in Indian time. */
const NOW = "2026-11-20T18:30:00+05:30";
const TODAY = "2026-11-20";
const PAYMENTS = seededPayments("meena.r", TODAY);

test.use({ timezoneId: "Asia/Kolkata", locale: "en-IN" });

const ddmmyyyy = (iso: string) => iso.split("-").reverse().join("/");
const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(n);
const card = (page: Page, name: string) => page.getByRole("region", { name, exact: true });
const notifications = (page: Page) => card(page, "Notifications");
const payments = (page: Page) => card(page, "Payment history");
const grid = (page: Page) => page.getByRole("grid", { name: "Payments in the chosen period" });
/** Payment rows: every grid row but the header and the total. */
const paymentRows = (page: Page) => grid(page).getByRole("row").filter({ hasNot: page.getByRole("columnheader") }).filter({ hasNotText: /^Total of/ });
const expectedRows = (r: Range) => PAYMENTS.filter((p) => inRange(p.date, r));
const receipts = (ps: Payment[]) => ps.map((p) => p.ref);

async function open(page: Page) {
  await page.clock.setFixedTime(new Date(NOW));
  await page.goto(URL);
  await expect(notifications(page).getByRole("checkbox")).toHaveCount(7);
}

test.describe("Citizen dashboard", () => {
  test.beforeEach(async ({ context }) => {
    await seedSession(context);
    await mockDelays(context, { delays: { SKELETON: 300, STREAM_DASHBOARD: 300, PROFILE_SAVE: 400 } });
  });

  test("[DYN-03] cards hold placeholder rows (same elements as the real ones) until the data and the streamed updates arrive", async ({ page, context }) => {
    await mockDelays(context, { delays: { SKELETON: 2000, STREAM_DASHBOARD: 3000 } });
    await page.clock.setFixedTime(new Date(NOW));
    await page.goto(URL, { waitUntil: "commit" });
    const body = notifications(page).locator("[aria-busy]");
    await expect(body).toHaveAttribute("aria-busy", "true");
    // The list already has <li>s: counting them now gives 4 placeholders, not 6 notifications.
    await expect(notifications(page).getByRole("listitem")).toHaveCount(4);
    // Only "Select all" exists yet (disabled); the rows have no checkboxes.
    await expect(notifications(page).getByRole("checkbox")).toHaveCount(1);
    await expect(notifications(page).getByLabel("Select all")).toBeDisabled();
    await expect(grid(page)).toHaveAttribute("aria-busy", "true");
    await expect(grid(page).getByRole("row")).toHaveCount(4);
    // The server-streamed card: a busy skeleton first, then the list replaces it.
    const updates = card(page, "Service updates");
    await expect(updates.locator("[aria-busy=true]")).toBeVisible();
    await expect(updates.getByRole("listitem")).toHaveCount(0);

    await expect(body).toHaveAttribute("aria-busy", "false", { timeout: 6000 });
    await expect(notifications(page).getByRole("listitem")).toHaveCount(6);
    await expect(notifications(page).getByText("3 unread")).toBeVisible();
    await expect(grid(page)).toHaveAttribute("aria-busy", "false");
    await expect(updates.getByRole("listitem")).toHaveCount(4, { timeout: 6000 });
    await expect(updates.locator("[aria-busy=true]")).toHaveCount(0);
  });

  test("[CHK-06] select all is indeterminate only as a DOM property; clicking it then selects everything", async ({ page }) => {
    await open(page);
    const all = notifications(page).getByLabel("Select all");
    const state = () => all.evaluate((el: HTMLInputElement) => ({ indeterminate: el.indeterminate, checked: el.checked, attr: el.hasAttribute("indeterminate"), aria: el.getAttribute("aria-checked") }));
    expect(await state()).toEqual({ indeterminate: false, checked: false, attr: false, aria: null });

    await notifications(page).getByLabel(/site inspection/).check();
    await expect(all).toBeChecked({ indeterminate: true });
    expect(await state()).toEqual({ indeterminate: true, checked: false, attr: false, aria: null });
    await expect(notifications(page).getByRole("button", { name: "Delete" })).toBeEnabled();

    await all.click();
    await expect(all).toBeChecked();
    expect(await state()).toMatchObject({ indeterminate: false, checked: true });
    for (const box of await notifications(page).getByRole("checkbox").all()) await expect(box).toBeChecked();

    await notifications(page).getByLabel(/profile has been verified/).uncheck();
    await expect(all).toBeChecked({ indeterminate: true });
    await all.click();
    await all.click();
    await expect(notifications(page).getByRole("checkbox").and(page.locator(":checked"))).toHaveCount(0);
  });

  test("[DLG-11] delete shows a snackbar with Undo; Undo restores, otherwise the deletion is saved when it closes", async ({ page, context }) => {
    await mockDelays(context, { delays: { SKELETON: 300, STREAM_DASHBOARD: 300, UNDO_WINDOW: 2500 } });
    await open(page);
    const n = notifications(page);
    await n.getByLabel(/site inspection/).check();
    await n.getByLabel(/hall booking/).check();
    await n.getByRole("button", { name: "Delete" }).click();
    const snack = page.getByRole("status").filter({ hasText: "Notifications deleted: 2" });
    await expect(snack).toBeVisible();
    await expect(n.getByRole("listitem")).toHaveCount(4);
    await snack.getByRole("button", { name: "Undo" }).click();
    await expect(snack).toBeHidden();
    await expect(n.getByRole("listitem")).toHaveCount(6);
    await expect(n.getByText("Notifications restored: 2")).toBeVisible();

    await n.getByLabel(/site inspection/).check();
    await n.getByRole("button", { name: "Delete" }).click();
    const one = page.getByRole("status").filter({ hasText: "Notifications deleted: 1" });
    await expect(one).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("amc.dashNotices"))).toBeNull();
    // The snackbar removes itself after UNDO_WINDOW; only then is the deletion stored.
    await expect(one).toBeHidden({ timeout: 5000 });
    expect(JSON.parse((await page.evaluate(() => localStorage.getItem("amc.dashNotices")))!)).toEqual({ "meena.r": { read: [], deleted: ["NT-1037"] } });
    await page.reload();
    await expect(n.getByRole("listitem")).toHaveCount(5);
    await expect(n.getByText(/site inspection/)).toHaveCount(0);
  });

  test("[TXT-08] readonly, disabled and aria-disabled fields behave differently; email changes only after Change email", async ({ page }) => {
    await open(page);
    // getByLabel("Astheen ID") would also match a notification that mentions the Astheen ID.
    const id = page.getByRole("textbox", { name: "Astheen ID" });
    const mobile = page.getByLabel("Registered mobile number");
    const email = page.getByLabel("Email address");
    // readonly: enabled and focusable, not editable.
    await expect(id).toBeEnabled();
    await expect(id).not.toBeEditable();
    await expect(id).toHaveValue(USERS.meena.astheenId);
    await id.focus();
    await expect(id).toBeFocused();
    // disabled: not focusable, left out of the form data.
    await expect(mobile).toBeDisabled();
    expect(await mobile.evaluate((el: HTMLInputElement) => el.disabled)).toBe(true);
    const data = await email.evaluate((el: HTMLInputElement) => [...new FormData(el.form!).keys()]);
    expect(data).toEqual(["astheenId", "email"]);
    // aria-disabled: the DOM says enabled, Playwright says disabled; typed text snaps back.
    expect(await email.evaluate((el: HTMLInputElement) => el.disabled)).toBe(false);
    await expect(email).toHaveAttribute("aria-disabled", "true");
    await expect(email).toBeDisabled();
    await expect(email.fill("x@y.example", { timeout: 1000 })).rejects.toThrow(/not enabled|disabled|Timeout/);
    await email.focus();
    await page.keyboard.type("zz");
    await expect(email).toHaveValue(USERS.meena.email);

    await page.getByRole("button", { name: "Change email" }).click();
    await expect(email).toBeEnabled();
    await email.fill("meena.new@mail.example");
    await page.getByRole("button", { name: "Save email" }).click();
    await expect(page.getByRole("button", { name: "Saving…" })).toBeVisible();
    await expect(page.getByText("Your email address has been updated.")).toBeVisible();
    await expect(email).toHaveAttribute("aria-disabled", "true");
    await page.reload();
    await expect(page.getByLabel("Email address")).toHaveValue("meena.new@mail.example");
  });

  test("[SHD-04] the profile card's frame is an open shadow root; name and form are slotted light-DOM children", async ({ page }) => {
    await open(page);
    const host = page.locator("amc-profile-card");
    const info = await host.evaluate((el) => ({
      open: !!el.shadowRoot,
      shadowText: el.shadowRoot!.textContent,
      initials: el.shadowRoot!.querySelector(".avatar")?.textContent,
      inputsInShadow: el.shadowRoot!.querySelectorAll("input").length,
      nameSlot: el.querySelector("h2")!.assignedSlot?.name,
      formSlot: el.querySelector("form")!.assignedSlot?.name,
      light: el.textContent,
    }));
    expect(info).toMatchObject({ open: true, initials: "MR", inputsInShadow: 0, nameSlot: "name", formSlot: "" });
    expect(info.shadowText).toContain("Verified citizen");
    expect(info.shadowText).not.toContain("Meena");
    expect(info.light).toContain("Meena Rajendran");
    expect(info.light).not.toContain("Verified citizen");
    // CSS / role locators pierce the open root; XPath does not.
    await expect(host.getByText("Verified citizen")).toBeVisible();
    await expect(page.locator("xpath=//*[contains(text(),'Verified citizen')]")).toHaveCount(0);
    await expect(page.locator("xpath=//amc-profile-card//input[@id='pf-email']")).toHaveCount(1);
    // The slotted heading is laid out inside the shadow frame, next to the initials.
    const avatar = await host.locator(".avatar").boundingBox();
    const name = await host.getByRole("heading", { name: "Meena Rajendran" }).boundingBox();
    expect(name!.x).toBeGreaterThan(avatar!.x + avatar!.width);
  });

  test("[HYD-02] the server HTML says “Welcome”; after hydration the same heading greets the citizen and shows the last sign-in", async ({ page, browser }) => {
    const noJs = await browser.newContext({ javaScriptEnabled: false, timezoneId: "Asia/Kolkata" });
    const raw = await noJs.newPage();
    await raw.goto(URL);
    await expect(raw.getByRole("heading", { level: 1 })).toHaveText("Welcome");
    await expect(raw.locator("#dash-last-signin")).toHaveText("Last sign-in: —");
    await noJs.close();

    await page.clock.setFixedTime(new Date(NOW));
    await page.goto(URL);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Good evening, Meena Rajendran");
    await expect(page.locator("#dash-last-signin")).toHaveText("This is your first sign-in on this device.");

    // A previous sign-in on this device (09:14 IST on 18/11/2026) shows in DD/MM/YYYY.
    await page.evaluate(() => localStorage.setItem("amc.signIns", JSON.stringify({ "meena.r": ["2026-11-18T03:44:00.000Z"] })));
    await page.clock.setFixedTime(new Date("2026-11-21T08:05:00+05:30"));
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Good morning, Meena Rajendran");
    await expect(page.locator("#dash-last-signin")).toHaveText("Last sign-in: 18/11/2026 09:14");
  });

  test("[DLG-18] Allow alerts asks for the notification permission; the answer decides the status", async ({ page, context, baseURL }) => {
    await open(page);
    const prefs = card(page, "Preferences");
    await expect(prefs.getByText("Get an alert in this browser before a bill or booking payment falls due.")).toBeVisible();
    // No grant: headless Chromium closes the prompt without a choice.
    await prefs.getByRole("button", { name: "Allow alerts" }).click();
    await expect(prefs.getByText("Alerts were not turned on. You can allow them at any time.")).toBeVisible();
    // Granted (as the browser's permission prompt would): the status turns on and the button goes away.
    await context.grantPermissions(["notifications"], { origin: baseURL });
    await prefs.getByRole("button", { name: "Allow alerts" }).click();
    await expect(prefs.getByText("Alerts are on for this browser.")).toBeVisible();
    await expect(prefs.getByRole("button", { name: "Allow alerts" })).toHaveCount(0);
    await page.reload();
    await expect(card(page, "Preferences").getByText("Alerts are on for this browser.")).toBeVisible();
  });

  test("[OTH-10] paperless billing is a role=switch button; its state is aria-checked and is kept", async ({ page }) => {
    await open(page);
    const sw = page.getByRole("switch", { name: "Paperless billing" });
    await expect(sw).toHaveJSProperty("tagName", "BUTTON");
    await expect(sw).not.toBeChecked();
    await expect(sw).toHaveAttribute("aria-checked", "false");
    await sw.click();
    await expect(sw).toBeChecked();
    await expect(page.getByText(`Bills and receipts are sent only by email to ${USERS.meena.email}.`)).toBeVisible();
    await page.reload();
    await expect(page.getByRole("switch", { name: "Paperless billing" })).toHaveAttribute("aria-checked", "true");
    await page.getByRole("switch", { name: "Paperless billing" }).press("Space");
    await expect(page.getByRole("switch", { name: "Paperless billing" })).not.toBeChecked();
    await expect(page.getByText("Printed bills are delivered to your address.")).toBeVisible();
  });

  test("[BTN-08][DLG-03] a document's actions are only in its right-click menu; Rename uses window.prompt", async ({ page }) => {
    await open(page);
    const docs = card(page, "My documents");
    const doc = docs.getByRole("listitem").filter({ hasText: "Birth certificate – Kavin M." });
    await expect(docs.getByRole("button")).toHaveCount(1); // only the card's grip
    await doc.click();
    await expect(page.getByRole("menu")).toHaveCount(0);

    await doc.click({ button: "right" });
    const menu = page.getByRole("menu", { name: "Birth certificate – Kavin M." });
    await expect(menu.getByRole("menuitem")).toHaveText(["View details", "Rename…"]);
    await expect(menu.getByRole("menuitem").first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(doc).toBeFocused();
    // Keyboard: Shift+F10 on the focused row.
    await page.keyboard.press("Shift+F10");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("region", { name: "Document details" })).toContainText("AMC/BC/2026/001942");

    // Cancel keeps the name.
    page.once("dialog", (d) => d.dismiss());
    await doc.click({ button: "right" });
    await page.getByRole("menuitem", { name: "Rename…" }).click();
    await expect(doc).toContainText("Birth certificate – Kavin M.");

    const seen: { type: string; message: string; value: string }[] = [];
    page.once("dialog", (d) => { seen.push({ type: d.type(), message: d.message(), value: d.defaultValue() }); return d.accept("  Kavin birth certificate  "); });
    await doc.click({ button: "right" });
    await page.getByRole("menuitem", { name: "Rename…" }).click();
    expect(seen).toEqual([{ type: "prompt", message: "New name for this document", value: "Birth certificate – Kavin M." }]);
    await expect(docs.getByText("Renamed to “Kavin birth certificate”.")).toBeVisible();
    await expect(docs.getByRole("listitem").filter({ hasText: "Kavin birth certificate" })).toContainText("AMC/BC/2026/001942");
    await page.reload();
    await expect(card(page, "My documents").getByText("Kavin birth certificate", { exact: true })).toBeVisible();
  });

  test("[TBL-03] payment history is a div role=grid: no table, rows by aria-rowindex, sortable, arrow-key navigation", async ({ page }) => {
    await open(page);
    const range = presetRange(TODAY, 12);
    const rows = expectedRows(range);
    await expect(payments(page).locator("table, tr, td")).toHaveCount(0);
    await expect(grid(page)).toHaveAttribute("aria-rowcount", String(rows.length + 2));
    await expect(paymentRows(page)).toHaveCount(rows.length);
    await expect(paymentRows(page).locator("[aria-colindex='2']")).toHaveText(receipts(rows));
    const total = grid(page).getByRole("row").last();
    await expect(total).toHaveAttribute("aria-rowindex", String(rows.length + 2));
    await expect(total).toContainText(`Total of ${rows.length} payments`);
    await expect(total).toContainText(inr(rows.reduce((s, p) => s + p.amount, 0)));

    // A row is found by its receipt number; cells by column index.
    const row = grid(page).getByRole("row").filter({ has: page.getByRole("gridcell", { name: "AMC/PT/2026/003118", exact: true }) });
    await expect(row.locator("[aria-colindex='5']")).toHaveText(inr(4862));

    await grid(page).getByRole("columnheader", { name: "Amount" }).getByRole("button").click();
    await expect(grid(page).getByRole("columnheader", { name: "Amount" })).toHaveAttribute("aria-sort", "descending");
    const byAmount = [...rows].sort((a, b) => b.amount - a.amount || b.date.localeCompare(a.date));
    await expect(paymentRows(page).locator("[aria-colindex='2']")).toHaveText(receipts(byAmount));

    await paymentRows(page).first().locator("[aria-colindex='1']").click();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowRight");
    await expect(paymentRows(page).nth(1).locator("[aria-colindex='2']")).toBeFocused();
    await page.keyboard.press("Control+End");
    await expect(total.locator("[aria-colindex='5']")).toBeFocused();
  });

  test("[DAT-03] the period is chosen with two clicks in the calendar and Apply; the grid and charts follow", async ({ page }) => {
    await open(page);
    const trigger = payments(page).getByRole("button", { name: /^Period/ });
    await expect(trigger).toHaveText(/01\/12\/2025 – 20\/11\/2026/);
    await trigger.click();
    const pop = page.getByRole("dialog", { name: "Choose a period" });
    await expect(pop.getByText("November 2026")).toBeVisible();
    await expect(pop.getByRole("button", { name: "21 November 2026" })).toBeDisabled();
    for (let i = 0; i < 5; i++) await pop.getByRole("button", { name: "Previous month" }).click();
    await expect(pop.getByText("June 2026")).toBeVisible();
    await pop.getByRole("button", { name: "1 June 2026", exact: true }).click();
    await expect(pop.getByRole("button", { name: "Apply" })).toBeDisabled();
    await pop.getByRole("button", { name: "Next month" }).click();
    await pop.getByRole("button", { name: "Next month" }).click();
    await pop.getByRole("button", { name: "31 August 2026" }).click();
    await expect(pop.getByText("From 01/06/2026 to 31/08/2026")).toBeVisible();
    // The period changes only on Apply.
    await expect(trigger).toHaveText(/01\/12\/2025 – 20\/11\/2026/);
    await pop.getByRole("button", { name: "Apply" }).click();
    await expect(pop).toHaveCount(0);
    await expect(trigger).toHaveText(/01\/06\/2026 – 31\/08\/2026/);
    const r = { from: "2026-06-01", to: "2026-08-31" };
    await expect(paymentRows(page).locator("[aria-colindex='2']")).toHaveText(receipts(expectedRows(r)));

    // Escape keeps the period; a quick choice applies at once. The calendar reopens on the period's last month.
    await trigger.click();
    await expect(pop.getByText("August 2026")).toBeVisible();
    await pop.getByRole("button", { name: "Previous month" }).click();
    await pop.getByRole("button", { name: "1 July 2026", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(trigger).toHaveText(/01\/06\/2026 – 31\/08\/2026/);
    await trigger.click();
    await pop.getByRole("button", { name: "Last 3 months" }).click();
    await expect(trigger).toHaveText(/01\/09\/2026 – 20\/11\/2026/);
    await expect(paymentRows(page)).toHaveCount(expectedRows(presetRange(TODAY, 3)).length);
  });

  test("[OTH-16] the totals by service are SVG <text>; they match the grid and follow the period", async ({ page }) => {
    await open(page);
    const svg = payments(page).locator("svg[role=img]");
    const check = async (r: Range) => {
      const totals = serviceTotals(expectedRows(r));
      await expect(svg.locator("g")).toHaveCount(totals.length);
      await expect(svg.locator("text[text-anchor=end]")).toHaveText(totals.map((x) => inr(x.total)));
      // The longest bar belongs to the largest total.
      const widths = await svg.locator("rect").evaluateAll((rs) => rs.map((r) => Number(r.getAttribute("width"))));
      const max = Math.max(...totals.map((x) => x.total));
      expect(widths[totals.findIndex((x) => x.total === max)]).toBe(Math.max(...widths));
    };
    await check(presetRange(TODAY, 12));
    await expect(page.locator("xpath=//*[local-name()='svg']//*[local-name()='text'][.='Property tax']")).toHaveCount(1);
    await expect(page.locator("xpath=//svg//text")).toHaveCount(0);
    await payments(page).getByRole("button", { name: /^Period/ }).click();
    await page.getByRole("button", { name: "Last 3 months" }).click();
    await check(presetRange(TODAY, 3));
  });

  test("[OTH-15] the monthly chart is canvas pixels only; bar heights match the totals and clicking a bar picks that month", async ({ page }) => {
    await open(page);
    const canvas = payments(page).locator("canvas");
    await expect(canvas).toHaveAttribute("role", "img");
    expect(await canvas.evaluate((c) => c.childElementCount + (c.textContent ?? "").length)).toBe(0);
    const range = presetRange(TODAY, 12);
    const totals = monthlyTotals(expectedRows(range), range);
    const width = await canvas.evaluate((c) => c.clientWidth);
    const boxes = barBoxes(width, totals.map((m) => m.total));
    const bar = await canvas.evaluate((c) => getComputedStyle(document.documentElement).getPropertyValue("--c-primary").trim());
    const rgb = bar.match(/[0-9a-f]{2}/gi)!.map((h) => parseInt(h, 16));
    /** Whether the CSS pixel (x, y) of the canvas has the bar colour. */
    const isBar = (pts: [number, number][]) => canvas.evaluate((c: HTMLCanvasElement, { pts, rgb }) => {
      const ctx = c.getContext("2d")!;
      const k = c.width / c.clientWidth;
      return pts.map(([x, y]) => {
        const d = ctx.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data;
        return Math.abs(d[0] - rgb[0]) + Math.abs(d[1] - rgb[1]) + Math.abs(d[2] - rgb[2]) < 30 && d[3] > 200;
      });
    }, { pts, rgb });
    // Just inside the top of every bar is bar colour; a few pixels above a bar (that is not full height) is not.
    const tall = boxes.filter((b) => b.h >= 4);
    expect(tall.length).toBe(totals.filter((m) => m.total > 0).length);
    expect(await isBar(tall.map((b) => [b.x + b.w / 2, b.y + 2]))).toEqual(tall.map(() => true));
    const notFull = tall.filter((b) => b.y > CHART.top + 6);
    expect(await isBar(notFull.map((b) => [b.x + b.w / 2, b.y - 4]))).toEqual(notFull.map(() => false));

    // Click October's bar: the period becomes October and the grid lists only October's payments.
    const i = totals.findIndex((m) => m.month === "2026-10");
    await canvas.click({ position: { x: boxes[i].x + boxes[i].w / 2, y: boxes[i].y + boxes[i].h / 2 } });
    await expect(payments(page).getByRole("button", { name: /^Period/ })).toHaveText(/01\/10\/2026 – 31\/10\/2026/);
    const oct = expectedRows({ from: "2026-10-01", to: "2026-10-31" });
    await expect(paymentRows(page).locator("[aria-colindex='1']")).toHaveText(oct.map((p) => ddmmyyyy(p.date)));
  });

  test("[OTH-04] cards reorder by pointer drag on the grip (no HTML5 drag-and-drop); the order is kept", async ({ page }) => {
    await open(page);
    const headings = page.locator("main h2").filter({ hasText: /^(Notifications|My applications|Payment history|My documents)$/ });
    await expect(headings).toHaveText(["Notifications", "My applications", "Payment history", "My documents"]);
    const grip = page.getByRole("button", { name: "Move card: Notifications" });
    await expect(page.locator("[draggable=true]")).toHaveCount(0);

    // Synthetic HTML5 drag events do nothing.
    await grip.dispatchEvent("dragstart");
    await payments(page).dispatchEvent("drop");
    await expect(headings).toHaveText(["Notifications", "My applications", "Payment history", "My documents"]);

    // A real pointer drag onto the middle of Payment history puts Notifications in its place.
    const from = (await grip.boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2, from.y + 40, { steps: 4 });
    const target = (await payments(page).boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, target.y + target.height / 2, { steps: 10 });
    await page.mouse.up();
    await expect(headings).toHaveText(["My applications", "Payment history", "Notifications", "My documents"]);
    expect(JSON.parse((await page.evaluate(() => localStorage.getItem("amc.dashLayout")))!)).toEqual({ "meena.r": ["applications", "payments", "notifications", "documents"] });

    // Keyboard: Space lifts, ArrowUp moves, Space drops.
    await page.getByRole("button", { name: "Move card: My documents" }).focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Space");
    await expect(headings).toHaveText(["My applications", "My documents", "Payment history", "Notifications"]);
    await page.reload();
    await expect(headings).toHaveText(["My applications", "My documents", "Payment history", "Notifications"]);
    await page.getByRole("button", { name: "Restore original card order" }).click();
    await expect(headings).toHaveText(["Notifications", "My applications", "Payment history", "My documents"]);
  });

  test("[TBL-03][DAT-03] at 390px the grid rows are stacked and nothing scrolls sideways", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    await expect(paymentRows(page).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await payments(page).getByRole("button", { name: /^Period/ }).click();
    const pop = page.getByRole("dialog", { name: "Choose a period" });
    const box = (await pop.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    // The header row is still in the grid (for assistive tech) but takes no space.
    await expect(grid(page).getByRole("columnheader")).toHaveCount(5);
    expect((await grid(page).getByRole("row").first().boundingBox())?.height ?? 0).toBeLessThanOrEqual(1);
  });
});
