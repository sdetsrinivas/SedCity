import fs from "node:fs";
import type { Page } from "@playwright/test";
import { test, expect, mockDelays } from "./fixtures";

const URL = "/directory/officials";

const combo = (page: Page) => page.getByRole("combobox", { name: "Department" });
const table = (page: Page) => page.getByRole("table");
const bodyRows = (page: Page) => table(page).locator("tbody tr");
const range = (page: Page) => page.getByText(/^Showing \d+–\d+ of \d+ officials$/);
/** The spinner overlay over the table and pager (DYN-02); it has no role or id. */
const overlay = (page: Page) => page.locator('[aria-busy="true"] > div').filter({ hasText: "Loading…" });
const rowOf = (page: Page, name: string) => page.locator("tbody tr").filter({ has: page.getByRole("rowheader", { name, exact: true }) });

test.describe("Officials directory", () => {
  test.beforeEach(async ({ context }) => {
    await mockDelays(context, { delays: { DIRECTORY_PAGE: 300, DIRECTORY_EXPORT: 300 } });
  });

  test("[TBL-02] columns sort both ways and the table pages ten at a time", async ({ page }) => {
    await page.goto(URL);
    await expect(bodyRows(page)).toHaveCount(10);
    await expect(range(page)).toHaveText("Showing 1–10 of 61 officials");
    await expect(page.locator("th[aria-sort]")).toHaveCount(0);

    // Page buttons show only the number; their accessible name is "Page n".
    await expect(page.getByRole("button", { name: "3", exact: true })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Pages" }).getByText("3", { exact: true })).toHaveCount(1);
    await page.getByRole("button", { name: "Page 3" }).click();
    await expect(range(page)).toHaveText("Showing 21–30 of 61 officials");
    await expect(page.getByRole("button", { name: "Page 3" })).toHaveAttribute("aria-current", "page");
    await expect(bodyRows(page).first().getByRole("rowheader")).toHaveText("G. Dinesh");

    // Sorting goes back to page 1 and sets aria-sort on that column only.
    const name = page.getByRole("columnheader", { name: "Name" });
    await name.getByRole("button").click();
    await expect(name).toHaveAttribute("aria-sort", "ascending");
    await expect(range(page)).toHaveText("Showing 1–10 of 61 officials");
    const firstNames = await bodyRows(page).getByRole("rowheader").allTextContents();
    expect(firstNames[0]).toBe("A. Deepa");
    expect(firstNames).toEqual([...firstNames].sort((a, b) => a.localeCompare(b, "en-IN", { sensitivity: "base" })));

    await name.getByRole("button").click();
    await expect(name).toHaveAttribute("aria-sort", "descending");
    await expect(bodyRows(page).first().getByRole("rowheader")).toHaveText("V. Vignesh");
    await expect(page.locator("th[aria-sort]")).toHaveCount(1);

    // Last page: one row, Next natively disabled.
    await page.getByRole("button", { name: "Page 7" }).click();
    await expect(range(page)).toHaveText("Showing 61–61 of 61 officials");
    await expect(bodyRows(page)).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();
    await page.getByRole("button", { name: "Previous" }).click();
    await expect(range(page)).toHaveText("Showing 51–60 of 61 officials");

    // Sort by office: head office first, zones in order, ties in published order.
    const office = page.getByRole("columnheader", { name: "Office" });
    await office.getByRole("button").click();
    await expect(office).toHaveAttribute("aria-sort", "ascending");
    await expect(name).not.toHaveAttribute("aria-sort");
    await expect(bodyRows(page).first()).toContainText("R. Senthil Kumar");
    await page.getByRole("button", { name: "Page 7" }).click();
    await expect(bodyRows(page)).toHaveCount(1);
    await expect(bodyRows(page).first()).toContainText("Zone VI – Kadalkarai");
  });

  test("[DYN-02] a spinner overlay covers the table while a page loads; the old rows stay underneath", async ({ page, context }) => {
    await mockDelays(context, { delays: { DIRECTORY_PAGE: 2500 } });
    await page.goto(URL);
    await expect(overlay(page)).toHaveCount(0);
    await page.getByRole("button", { name: "Next" }).click();
    await expect(overlay(page)).toBeVisible();

    // Still the previous page under the overlay: rows and range text read now are stale.
    await expect(bodyRows(page).first().getByRole("rowheader")).toHaveText("R. Senthil Kumar");
    await expect(range(page)).toHaveText("Showing 1–10 of 61 officials");

    // The overlay takes the pointer: Playwright's click waits and times out, and the point under the
    // button belongs to the overlay.
    const page3 = page.getByRole("button", { name: "Page 3" });
    const err = await page3.click({ timeout: 600 }).then(() => null, (e: Error) => e.message);
    expect(err).toMatch(/intercepts pointer events/);
    const hit = await page3.evaluate((b) => {
      const r = b.getBoundingClientRect();
      const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { onButton: b.contains(el), inOverlay: !!el?.closest("[aria-busy=true] > div:last-child") };
    });
    expect(hit).toEqual({ onButton: false, inOverlay: true });
    // A script click reaches the button behind the overlay, but the app ignores it while loading.
    await page3.evaluate((b: HTMLButtonElement) => b.click());

    await expect(overlay(page)).toHaveCount(0, { timeout: 5_000 });
    await expect(range(page)).toHaveText("Showing 11–20 of 61 officials");
    await expect(bodyRows(page).first().getByRole("rowheader")).toHaveText("C. Balaji");
    await expect(page.getByRole("button", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
    // Now the same click goes through.
    await page3.click();
    await expect(range(page)).toHaveText("Showing 21–30 of 61 officials");
  });

  test("[DYN-02] a page that fails to load shows an error instead of the table", async ({ page, context }) => {
    await page.goto(URL);
    await expect(bodyRows(page)).toHaveCount(10);
    await mockDelays(context, { delays: { DIRECTORY_PAGE: 300 }, fail: ["DIRECTORY_PAGE"] });
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "could not be loaded" })).toBeVisible();
    await expect(table(page)).toHaveCount(0);
    await expect(range(page)).toHaveCount(0);
    await mockDelays(context, { delays: { DIRECTORY_PAGE: 300 } });
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(range(page)).toHaveText("Showing 11–20 of 61 officials");
  });

  test("[DRP-04] the department filter applies only when an option is chosen", async ({ page }) => {
    await page.goto(URL);
    const box = combo(page);
    await expect(box).toHaveValue("All departments");
    await expect(page.getByRole("option")).toHaveCount(0);

    // Not a <select>.
    const notSelect = await box.selectOption("engineering", { timeout: 1_000 }).then(() => null, (e: Error) => e.message);
    expect(notSelect).toMatch(/not a <select> element/);

    // Typed text without choosing is thrown away when the field loses focus.
    await box.fill("Engineering");
    await expect(page.getByRole("option")).toHaveCount(1);
    await box.press("Tab");
    await expect(box).toHaveValue("All departments");
    await expect(page.getByRole("option")).toHaveCount(0);
    await expect(range(page)).toHaveText("Showing 1–10 of 61 officials");
    await expect(page).toHaveURL(/\/directory\/officials$/);

    // Keyboard: typing filters and makes the first match active; Enter chooses it.
    await box.click();
    await expect(page.getByRole("option")).toHaveCount(14);
    await box.pressSequentially("pub");
    await expect(page.getByRole("option")).toHaveText(["Public Health"]);
    await expect(box).toHaveAttribute("aria-activedescendant", /.+/);
    await box.press("Enter");
    await expect(box).toHaveValue("Public Health");
    await expect(range(page)).toHaveText("Showing 1–6 of 6 officials");
    await expect(page).toHaveURL(/\?department=health$/);

    // ArrowDown from the closed field opens every option with the current one active; arrows move.
    await box.press("ArrowDown");
    await expect(page.getByRole("option")).toHaveCount(14);
    const activeText = () => page.evaluate(() => {
      const id = document.querySelector("[role=combobox]")?.getAttribute("aria-activedescendant");
      return id ? document.getElementById(id)?.textContent : null;
    });
    expect(await activeText()).toBe("Public Health");
    await box.press("ArrowDown");
    expect(await activeText()).toBe("Solid Waste Management");
    await box.press("Escape");
    await expect(page.getByRole("option")).toHaveCount(0);
    await expect(box).toHaveValue("Public Health");

    // Mouse: open, then click the option.
    await box.click();
    await page.getByRole("option", { name: "Town Planning" }).click();
    await expect(box).toHaveValue("Town Planning");
    await expect(range(page)).toHaveText("Showing 1–4 of 4 officials");
    await expect(bodyRows(page).getByRole("cell", { name: "Town Planning", exact: true })).toHaveCount(4);

    // No match: a message, no options, nothing applied.
    await box.fill("zzz");
    await expect(page.getByText("No department matches “zzz”.")).toBeVisible();
    await expect(page.getByRole("option")).toHaveCount(0);
    await box.press("Escape");
    await expect(box).toHaveValue("Town Planning");
  });

  test("[BTN-02] row actions are icons named only by aria-label", async ({ page }) => {
    await page.goto(URL);
    const row = rowOf(page, "V. Kavitha");
    const view = row.getByRole("button", { name: "View details of V. Kavitha" });
    const call = row.getByRole("link", { name: "Call V. Kavitha" });
    const mail = row.getByRole("link", { name: "Email V. Kavitha" });
    for (const action of [view, call, mail]) {
      await expect(action).toBeVisible();
      await expect(action).toHaveText("");
      await expect(action).not.toHaveAttribute("title");
    }
    // Nothing to find by visible text.
    await expect(page.getByText("View details", { exact: false })).toHaveCount(0);
    await expect(page.locator("main").getByText(/^Call$/)).toHaveCount(0);
    await expect(call).toHaveAttribute("href", "tel:1552026,202");
    await expect(mail).toHaveAttribute("href", "mailto:kavitha.v@amc.example");
    // Every row has the same three icons: 30 controls on the page, told apart only by their labels.
    await expect(table(page).locator("tbody").getByRole("button")).toHaveCount(10);
    await expect(table(page).locator("tbody").getByRole("link")).toHaveCount(20);

    // XPath on the attribute, as a Selenium test would.
    await page.locator("xpath=//button[@aria-label='View details of V. Kavitha']").click();
    const dialog = page.getByRole("dialog", { name: "V. Kavitha" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Additional Commissioner");
    await expect(dialog).toContainText("155 2026 · Ext. 202");
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toHaveCount(0);

    // A different row opens that official, not the first one.
    await rowOf(page, "K. Prakash").getByRole("button", { name: /^View details of/ }).click();
    await expect(page.getByRole("dialog", { name: "K. Prakash" })).toContainText("Zone VI – Kadalkarai");
  });

  test("[HYD-04] a filter replaces every row element; sorting and paging do not", async ({ page }) => {
    await page.goto(`${URL}?department=engineering`);
    await expect(range(page)).toHaveText("Showing 1–8 of 8 officials");
    await expect(combo(page)).toHaveValue("Engineering (Roads and Buildings)");

    // Sorting keeps the element (React moves it).
    const kept = await rowOf(page, "G. Dinesh").elementHandle();
    const name = page.getByRole("columnheader", { name: "Name" });
    await name.getByRole("button").click();
    await expect(name).toHaveAttribute("aria-sort", "ascending");
    await expect(bodyRows(page).first().getByRole("rowheader")).toHaveText("A. Mohan");
    expect(await kept!.evaluate((tr) => tr.isConnected)).toBe(true);

    // A filter that still lists the same official replaces the element anyway.
    await page.getByLabel("Name or designation").fill("engineer");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/department=engineering&q=engineer$/);
    await expect.poll(() => kept!.evaluate((tr) => tr.isConnected)).toBe(false);
    await expect(range(page)).toHaveText("Showing 1–8 of 8 officials");
    await expect(rowOf(page, "G. Dinesh")).toContainText("Chief Engineer");
    const stale = await kept!.click({ timeout: 1_000 }).then(() => null, (e: Error) => e.message);
    expect(stale).toMatch(/not attached to the DOM/);
    // A locator re-resolves and finds the new element.
    await rowOf(page, "G. Dinesh").getByRole("button", { name: "View details of G. Dinesh" }).click();
    await expect(page.getByRole("dialog", { name: "G. Dinesh" })).toBeVisible();
  });

  test("[HYD-04] a filter in the address is applied only after hydration", async ({ page, context, request }) => {
    await mockDelays(context, { delays: { DIRECTORY_PAGE: 2000 } });
    const deepLink = `${URL}?department=engineering`;
    // The server ignores the address: its HTML is the first page of the whole directory.
    const html = await (await request.get(deepLink)).text();
    expect(html).toContain("Showing 1–10 of 61 officials");
    expect(html).toContain("R. Senthil Kumar");
    expect(html).not.toContain("G. Dinesh");

    await page.goto(deepLink);
    const serverRow = await rowOf(page, "R. Senthil Kumar").elementHandle();
    await expect(overlay(page)).toBeVisible();
    await expect(combo(page)).toHaveValue("Engineering (Roads and Buildings)");
    await expect(range(page)).toHaveText("Showing 1–10 of 61 officials");
    await expect(range(page)).toHaveText("Showing 1–8 of 8 officials", { timeout: 5_000 });
    expect(await serverRow!.evaluate((tr) => tr.isConnected)).toBe(false);
    await expect(bodyRows(page)).toHaveCount(8);
  });

  test("[FIL-06] the CSV holds every matching official in the table's order", async ({ page, context }) => {
    await mockDelays(context, { delays: { DIRECTORY_PAGE: 300, DIRECTORY_EXPORT: 1500 } });
    await page.goto(URL);
    const button = page.getByRole("button", { name: "Download list (CSV)" });

    // Whole directory: 61 rows although the table shows 10.
    const pending = page.waitForEvent("download");
    await button.click();
    // DIRECTORY_EXPORT: the file comes only after "Preparing file…".
    await expect(page.getByRole("button", { name: "Preparing file…" })).toBeDisabled();
    const all = await pending;
    expect(all.suggestedFilename()).toBe("amc-officials-all.csv");
    const bytes = fs.readFileSync((await all.path())!);
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const lines = bytes.toString("utf8").replace(/^﻿/, "").split("\r\n");
    expect(lines.pop()).toBe("");
    expect(lines).toHaveLength(62);
    expect(lines[0]).toBe("Name,Designation,Department,Office,Phone,Email");
    expect(lines).toContain('K. Gayathri,"Superintending Engineer (Roads, Bridges and Buildings)",Engineering (Roads and Buildings),Corporation Head Office,155 2026 Ext. 602,gayathri.k@amc.example');
    await expect(button).toBeEnabled();

    // Filtered and sorted: the file follows both.
    await combo(page).fill("engin");
    await combo(page).press("Enter");
    await expect(range(page)).toHaveText("Showing 1–8 of 8 officials");
    const name = page.getByRole("columnheader", { name: "Name" });
    await name.getByRole("button").click();
    await name.getByRole("button").click();
    await expect(name).toHaveAttribute("aria-sort", "descending");
    const shown = await bodyRows(page).getByRole("rowheader").allTextContents();
    const [eng] = await Promise.all([page.waitForEvent("download"), button.click()]);
    expect(eng.suggestedFilename()).toBe("amc-officials-engineering.csv");
    const engLines = fs.readFileSync((await eng.path())!, "utf8").replace(/^﻿/, "").trimEnd().split("\r\n");
    expect(engLines.slice(1).map((l) => l.split(",")[0])).toEqual(shown);
  });

  test("[FIL-06] a failed export shows an error and saves nothing", async ({ page, context }) => {
    await mockDelays(context, { delays: { DIRECTORY_EXPORT: 300 }, fail: ["DIRECTORY_EXPORT"] });
    await page.goto(URL);
    let downloads = 0;
    page.on("download", () => downloads++);
    await page.getByRole("button", { name: "Download list (CSV)" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "The file could not be prepared. Please try again." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download list (CSV)" })).toBeEnabled();
    expect(downloads).toBe(0);
  });
});
