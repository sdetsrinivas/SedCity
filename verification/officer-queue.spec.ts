import type { Page } from "@playwright/test";
import { test, expect, mockDelays, seedSession } from "./fixtures";
import { arrivedItem, seededItems, sortBySla } from "../src/modules/officer/queue";

const URL = "/officer/queue";
/** Quick calls and no automatic refresh unless a check asks for one. */
const FAST = { QUEUE_LOAD: 200, QUEUE_DETAIL: 300, QUEUE_CLAIM: 300, QUEUE_POLL: 600_000 };

const table = (page: Page) => page.getByRole("table", { name: "Open grievances, the most urgent first" });
const refs = (page: Page) => table(page).getByRole("rowheader");
/** A grievance's row by its number (the year part follows the received date). */
const rowOf = (page: Page, no: string) => table(page).getByRole("row").filter({ has: page.getByRole("rowheader", { name: new RegExp(`/00${no}$`) }) });

/** The SLA order the browser should show, from the anchor and arrivals it stored in sessionStorage. */
async function expectedOrder(page: Page): Promise<string[]> {
  const { anchor, arrivals } = await page.evaluate(() => ({
    anchor: JSON.parse(sessionStorage.getItem("amc.queueAnchor")!) as number,
    arrivals: JSON.parse(sessionStorage.getItem("amc.queueArrivals") ?? "[]") as { index: number; at: number }[],
  }));
  return sortBySla([...seededItems(anchor), ...arrivals.map((a) => arrivedItem(a.index, a.at))]).map((i) => i.ref);
}

async function open(page: Page) {
  await page.goto(URL);
  await expect(refs(page)).toHaveCount(14);
}

test.describe("Officer work queue", () => {
  test.beforeEach(async ({ context }) => {
    await seedSession(context, "officer");
    await mockDelays(context, { delays: FAST });
  });

  test("[DRP-05] ward multi-select: options toggle with the list open, chips show a short name, Backspace and chip buttons remove", async ({ page }) => {
    await open(page);
    const box = page.getByRole("combobox", { name: "Wards" });
    await expect(box).toHaveAttribute("placeholder", "All wards of Zone II – Kalaivani");
    await box.click();
    const list = page.getByRole("listbox", { name: "Wards" });
    await expect(list).toHaveAttribute("aria-multiselectable", "true");
    await expect(list.getByRole("option")).toHaveCount(8);
    // A native select it is not.
    expect(await page.locator("select").count()).toBe(0);

    await list.getByRole("option", { name: /^Ward 14 – Kalaivani Nagar/ }).click();
    await expect(list).toBeVisible();
    await expect(list.getByRole("option", { name: /^Ward 14 – / })).toHaveAttribute("aria-selected", "true");
    await list.getByRole("option", { name: /^Ward 12 – Sangam Street/ }).click();
    const chips = page.getByRole("list", { name: "Selected wards" }).getByRole("listitem");
    await expect(chips).toHaveText(["Ward 12", "Ward 14"]);
    await expect(refs(page)).toHaveCount(4);
    await expect(page.getByText("Showing 4 of 14 open grievances")).toBeVisible();
    for (const ward of await table(page).locator("tbody td:nth-child(5)").allTextContents()) expect(ward).toMatch(/^Ward 1[24] – /);

    // Typing filters the options; Enter toggles the active one.
    await box.fill("thamarai");
    await expect(list.getByRole("option")).toHaveCount(1);
    await box.press("Enter");
    await expect(chips).toHaveText(["Ward 10", "Ward 12", "Ward 14"]);
    await expect(box).toHaveValue("");
    await expect(refs(page)).toHaveCount(6);

    // Backspace in the empty field removes the last chip; a chip's own button removes that ward.
    await box.press("Backspace");
    await expect(chips).toHaveText(["Ward 10", "Ward 12"]);
    await page.getByRole("button", { name: "Remove Ward 12 – Sangam Street" }).click();
    await expect(chips).toHaveText(["Ward 10"]);
    await box.press("Escape");
    await expect(list).toBeHidden();
    await expect(refs(page)).toHaveCount(2);

    // The choice is remembered.
    await page.reload();
    await expect(page.getByRole("list", { name: "Selected wards" }).getByRole("listitem")).toHaveText(["Ward 10"]);
    await expect(refs(page)).toHaveCount(2);
    await page.getByRole("button", { name: "Clear wards" }).click();
    await expect(refs(page)).toHaveCount(14);
  });

  test("[BTN-07] Claim needs a double-click: a click or Enter does nothing, a double-click claims and survives a reload", async ({ page }) => {
    await open(page);
    const row = rowOf(page, "4711");
    const claim = row.getByRole("button", { name: "Claim" });
    await claim.click();
    await claim.press("Enter");
    await page.waitForTimeout(800);
    await expect(claim).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("amc.queueClaims"))).toBeNull();

    await claim.dblclick();
    await expect(row.getByRole("button", { name: "Release" })).toBeVisible();
    await expect(row.getByText("You", { exact: true })).toBeVisible();
    const claims = JSON.parse((await page.evaluate(() => localStorage.getItem("amc.queueClaims")))!);
    expect(Object.entries(claims).map(([ref, c]) => [ref.slice(-6), (c as { by: string }).by])).toEqual([["004711", "officer.selvi"]]);

    // A colleague's claim has no button at all.
    await expect(rowOf(page, "4719").getByRole("button", { name: "Claim" })).toHaveCount(0);
    await expect(rowOf(page, "4719").getByText("K. Ravi")).toBeVisible();

    await page.reload();
    await expect(rowOf(page, "4711").getByRole("button", { name: "Release" })).toBeVisible();
    await rowOf(page, "4711").getByRole("button", { name: "Release" }).click();
    await expect(rowOf(page, "4711").getByRole("button", { name: "Claim" })).toBeVisible();
  });

  test("[DLG-10] bulk claim stacks one toast per grievance; successes close on their own timers, failures stay until dismissed", async ({ page, context }) => {
    await mockDelays(context, { delays: { ...FAST, QUEUE_CLAIM: 400, TOAST_TTL: 2500 } });
    await open(page);
    for (const no of ["4711", "4716", "4719", "4730"]) await rowOf(page, no).getByRole("checkbox").check();
    await expect(page.getByText("4 selected")).toBeVisible();
    await page.getByRole("button", { name: "Claim selected" }).click();

    const region = page.locator("body > [aria-live=polite]");
    const toast = (text: RegExp) => region.locator("[role=status], [role=alert]").filter({ hasText: text });
    // Several toasts are on screen at once, in the order the grievances finished.
    await expect(toast(/004716 claimed\./)).toBeVisible();
    await expect(toast(/004711 claimed\./)).toBeVisible();
    const texts = await region.locator("[role=status], [role=alert]").allTextContents();
    expect(texts.findIndex((t) => t.includes("004711"))).toBeLessThan(texts.findIndex((t) => t.includes("004716")));

    const failure = region.getByRole("alert").filter({ hasText: /004719 is already claimed by K\. Ravi\./ });
    await expect(failure).toBeVisible();
    await expect(toast(/004730 is already yours\./)).toBeVisible();
    await expect(toast(/^Claimed 2 of 4 selected grievances\./)).toBeVisible();
    await expect(page.getByText("0 selected")).toBeVisible();

    // The first success goes while later toasts are still showing; the failure stays.
    await expect(toast(/004711 claimed\./)).toBeHidden({ timeout: 4000 });
    await expect(toast(/^Claimed 2 of 4/)).toBeVisible();
    await expect(toast(/^Claimed 2 of 4/)).toBeHidden({ timeout: 4000 });
    await expect(failure).toBeVisible();
    await failure.getByRole("button", { name: "Dismiss notification" }).click();
    await expect(region.locator("[role=status], [role=alert]")).toHaveCount(0);

    await expect(rowOf(page, "4716").getByText("You", { exact: true })).toBeVisible();
    await expect(rowOf(page, "4719").getByText("K. Ravi")).toBeVisible();
  });

  test("[DYN-07] new grievances arrive on refresh and are inserted in SLA order; the rows below slide down", async ({ page, context }) => {
    await mockDelays(context, { delays: { ...FAST, QUEUE_POLL: 2500, QUEUE_REORDER: 1500 } });
    await open(page);
    expect(await refs(page).allTextContents()).toEqual(await expectedOrder(page));
    // The eighth row now is 004730.
    await expect(refs(page).nth(7)).toHaveText(/004730$/);

    await expect(refs(page)).toHaveCount(15, { timeout: 6000 });
    // The arrival took the eighth place; 004730 moved to the ninth and is still sliding into place.
    await expect(refs(page).nth(7)).toHaveText(/004757$/);
    await expect(refs(page).nth(8)).toHaveText(/004730$/);
    expect(await rowOf(page, "4730").evaluate((el) => getComputedStyle(el).transform)).not.toBe("none");
    await expect.poll(() => rowOf(page, "4730").evaluate((el) => getComputedStyle(el).transform), { timeout: 4000 }).toBe("none");
    expect(await refs(page).allTextContents()).toEqual(await expectedOrder(page));

    await expect(refs(page)).toHaveCount(17, { timeout: 10_000 });
    const order = await refs(page).allTextContents();
    expect(order).toEqual(await expectedOrder(page));
    expect(order.map((r) => r.slice(-4))).toEqual(["4702", "4705", "4711", "4716", "4719", "4723", "4728", "4757", "4730", "4734", "4737", "4759", "4741", "4744", "4762", "4748", "4752"]);
    // Due times (the Time left column) are ascending.
    const due = await table(page).locator("tbody td:nth-child(7) time").evaluateAll((ts) => ts.map((t) => Date.parse(t.getAttribute("datetime")!)));
    expect(due).toEqual([...due].sort((a, b) => a - b));

    // Only three grievances arrive; the queue stays the same after that, also across a reload.
    await page.waitForTimeout(3000);
    await expect(refs(page)).toHaveCount(17);
    await page.reload();
    await expect(refs(page)).toHaveCount(17);
  });

  test("[TBL-06] a row expands into a separate details row (loaded once) with the history; it is removed when closed", async ({ page }) => {
    await open(page);
    const rows = table(page).locator("tbody > tr");
    await expect(rows).toHaveCount(14);
    await expect(table(page).getByRole("button", { name: "Show details" })).toHaveCount(14);

    const row = rowOf(page, "4702");
    const toggle = row.getByRole("button", { name: "Show details" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    const hide = row.getByRole("button", { name: "Hide details" });
    await expect(hide).toHaveAttribute("aria-expanded", "true");
    const detail = page.locator(`#${await hide.getAttribute("aria-controls")}`);
    await expect(detail.getByText("Loading details…")).toBeVisible();
    await expect(detail.getByText(/Drain in front of house no\. 12/)).toBeVisible();
    await expect(rows).toHaveCount(15);
    await expect(refs(page)).toHaveCount(14);
    // The details row comes right after its row and spans every column.
    expect(await row.evaluate((tr) => tr.nextElementSibling?.id)).toBe(await hide.getAttribute("aria-controls"));
    await expect(detail.locator("td")).toHaveAttribute("colspan", "8");
    await expect(detail.getByRole("listitem")).toHaveText([
      /Registered online by the citizen$/, /Assigned to the zone office$/, /Citizen sent a reminder$/, /Escalated: service time exceeded$/,
    ]);

    // A second open row; claimed rows list who claimed them.
    await rowOf(page, "4730").getByRole("button", { name: "Show details" }).click();
    await expect(rows).toHaveCount(16);
    await expect(table(page).getByText("Claimed by Selvi Natarajan")).toBeVisible();

    await hide.click();
    await expect(detail).toHaveCount(0);
    await expect(rows).toHaveCount(15);
    await expect(toggle).not.toHaveAttribute("aria-controls");
    // Opened again: shown at once from the first load.
    await toggle.click();
    await expect(page.getByText(/Drain in front of house no\. 12/)).toBeVisible({ timeout: 200 });
    await expect(page.getByText("Loading details…")).toHaveCount(0);
  });
});
