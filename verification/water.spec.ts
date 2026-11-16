import { test, expect, mockDelays } from "./fixtures";

const URL = "/services/water/pay";
const MEENA = "W02-014-00731"; // 24 kL domestic → ₹332.50
const ARUL = "W01-003-01208"; // 38 kL domestic with arrears → ₹959.15

const rupees = (s: string | null) => Number((s ?? "").replace(/[^\d.]/g, ""));

test.describe("Water bill lookup", () => {
  test("[TXT-04] consumer number keeps typed text until blur, then reformats", async ({ page, context }) => {
    await mockDelays(context, { delays: { CONSUMER_LOOKUP: 0 } });
    await page.goto(URL);
    const input = page.getByLabel("Consumer number");
    await input.fill("w 02 014 00731");
    await expect(input).toHaveValue("w 02 014 00731");
    await input.press("Tab");
    await expect(input).toHaveValue(MEENA);

    await input.fill("0201400731");
    await expect(input).toHaveValue("0201400731");
    await page.getByRole("heading", { name: "Find your bill" }).click();
    await expect(input).toHaveValue(MEENA);

    // Pressing Enter without blurring also normalises the value before the lookup.
    await input.fill("01/003/01208");
    await input.press("Enter");
    await expect(input).toHaveValue(ARUL);

    // Invalid text is left untouched and submitting shows the format error.
    await input.fill("12345");
    await input.press("Tab");
    await expect(input).toHaveValue("12345");
    await page.getByRole("button", { name: "Fetch bill" }).click();
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Enter the 10-digit consumer number shown on your bill.")).toBeVisible();
  });

  test("[DYN-01] bill details appear only after the lookup returns", async ({ page, context }) => {
    await mockDelays(context, { delays: { CONSUMER_LOOKUP: 1500 } });
    await page.goto(URL);
    const panel = page.locator("#bill-details");
    await page.getByLabel("Consumer number").fill(MEENA);
    await page.getByRole("button", { name: "Fetch bill" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Fetching bill details" })).toBeVisible();
    await expect(panel).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Fetch bill" })).toBeDisabled();

    const region = page.getByRole("region", { name: "Bill details" });
    await expect(region).toBeVisible({ timeout: 5000 });
    await expect(region).toContainText(MEENA);
    await expect(region).toContainText("Meena Rajendran");

    // A new lookup removes the old panel before the new one arrives.
    await page.getByLabel("Consumer number").fill(ARUL);
    await page.getByRole("button", { name: "Fetch bill" }).click();
    await expect(panel).toHaveCount(0);
    await expect(region).toContainText("Arulmozhi Kannan", { timeout: 5000 });

    // Unknown consumer → alert, no panel.
    await page.getByLabel("Consumer number").fill("W06-047-99999");
    await page.getByRole("button", { name: "Fetch bill" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "No water connection was found" })).toBeVisible({ timeout: 5000 });
    await expect(panel).toHaveCount(0);
  });

  test("[DYN-01] a failed lookup shows a service error instead of the panel", async ({ page, context }) => {
    await mockDelays(context, { delays: { CONSUMER_LOOKUP: 0 }, fail: ["CONSUMER_LOOKUP"] });
    await page.goto(`${URL}?ref=0201400731`);
    await expect(page.getByRole("alert").filter({ hasText: "billing service is not responding" })).toBeVisible();
    await expect(page.locator("#bill-details")).toHaveCount(0);
    await expect(page.getByLabel("Consumer number")).toHaveValue(MEENA);
  });

  test("[TBL-04] nested slab table: outer rows only via child selectors", async ({ page, context }) => {
    await mockDelays(context, { delays: { CONSUMER_LOOKUP: 0 } });
    await page.goto(`${URL}?ref=${ARUL}`);
    const outer = page.locator("#bill-charges");
    await expect(outer).toBeVisible();

    const outerRows = page.locator("#bill-charges > tbody > tr");
    await expect(outerRows).toHaveCount(5);
    // The descendant selector also picks up the inner table's rows (header + 4 slabs).
    expect(await page.locator("#bill-charges tr").count()).toBe(1 + 5 + 1 + 1 + 4);

    const slabs = page.getByRole("table", { name: "Slab-wise breakup" });
    const slabRows = slabs.locator("tbody tr");
    await expect(slabRows).toHaveCount(4);
    const slabAmounts = (await slabRows.locator("td:last-child").allTextContents()).map(rupees);
    expect(slabAmounts).toEqual([60, 110, 180, 220]);

    const outerAmounts = (await page.locator("#bill-charges > tbody > tr > td:last-child").allTextContents()).map(rupees);
    expect(outerAmounts[0]).toBe(slabAmounts.reduce((a, b) => a + b, 0));
    expect(outerAmounts).toEqual([570, 142.5, 30, 212.4, 4.25]);
    const total = rupees(await page.locator("#bill-charges > tfoot td").textContent());
    expect(total).toBeCloseTo(outerAmounts.reduce((a, b) => a + b, 0), 2);
  });

  test("[OTH-12] amount payable is split across spans with a non-breaking space", async ({ page, context }) => {
    await mockDelays(context, { delays: { CONSUMER_LOOKUP: 0 } });
    await page.goto(`${URL}?ref=${MEENA}`);
    const amount = page.locator("#amount-due");
    await expect(amount).toBeVisible();

    await expect(amount.getByText("₹332.50", { exact: true })).toHaveCount(0);
    expect(await amount.textContent()).toBe("₹ 332.50");
    await expect(amount).toHaveText("₹ 332.50");
    await expect(amount.locator("span")).toHaveCount(3);

    const footer = await page.locator("#bill-charges > tfoot td").textContent();
    expect((await amount.textContent())!.replace(/\s/g, "")).toBe(footer!.replace(/\s/g, ""));

    // A paid bill shows nothing due.
    await page.getByLabel("Consumer number").fill("W03-021-03390");
    await page.getByRole("button", { name: "Fetch bill" }).click();
    await expect(page.getByRole("region", { name: "Bill details" })).toContainText("No amount is due");
    await expect(amount).toHaveText("₹ 0.00");
  });
});
