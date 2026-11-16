import { test, expect } from "./fixtures";

test.describe("Home", () => {
  test("[HYD-01] Quick Pay 'Pay now' ignores clicks until the island hydrates", async ({ page }) => {
    const start = Date.now();
    await page.goto("/");
    const payNow = page.getByRole("button", { name: "Pay now" });
    const field = page.getByLabel("Consumer / assessment number");
    await expect(payNow).toBeVisible();
    await expect(payNow).toBeEnabled();
    await payNow.click(); // early click: visible + enabled, but no listener yet
    await page.waitForTimeout(1500);
    await expect(field).toHaveCount(0); // and it was not replayed later
    await expect(async () => {
      await payNow.click({ timeout: 500 });
      await expect(field).toBeVisible({ timeout: 300 });
    }).toPass({ timeout: 10_000 });
    expect(Date.now() - start).toBeGreaterThan(3500);
  });

  test("[BTN-01] service tiles are a mix of anchors, buttons, divs and spans", async ({ page }) => {
    await page.goto("/");
    const section = page.getByRole("region", { name: "Popular services" });
    const tile = (label: string) => section.getByText(label, { exact: true }).locator("..");
    const info = async (label: string) => tile(label).evaluate((el) => ({ tag: el.tagName, role: el.getAttribute("role"), href: el.getAttribute("href") }));
    expect(await info("Water Bill Payment")).toMatchObject({ tag: "A", href: "/services/water/pay" });
    expect(await info("New Electricity Connection")).toMatchObject({ tag: "BUTTON", href: null });
    expect(await info("Register a Grievance")).toMatchObject({ tag: "DIV", role: null, href: null });
    expect(await info("Track Grievance")).toMatchObject({ tag: "DIV", role: "link", href: null });
    expect(await info("Book a Hall or Park")).toMatchObject({ tag: "SPAN", href: null });
    // Only real anchors are exposed as links to assistive tech / getByRole('link').
    await expect(section.getByRole("link", { name: "Register a Grievance" })).toHaveCount(0);
    await tile("Register a Grievance").click();
    await expect(page).toHaveURL(/\/grievances\/new$/);
  });

  test("[TXT-14] typeahead suggestions arrive after debounce + delay", async ({ page }) => {
    await page.goto("/");
    const search = page.getByRole("combobox", { name: "Search services" });
    await search.fill("water");
    await expect(page.getByRole("option")).toHaveCount(0); // nothing yet (debounced)
    const option = page.getByRole("option", { name: /Pay water bill/ });
    await expect(option).toBeVisible({ timeout: 4000 });
    await expect(search).toHaveAttribute("aria-expanded", "true");
    await search.press("ArrowDown");
    await expect(search).toHaveAttribute("aria-activedescendant", /.+/);
    await option.click();
    await expect(page).toHaveURL(/\/services\/water\/pay$/);
  });

  test("[OTH-17] carousel auto-rotates, keeps hidden slides in the DOM, and can be paused", async ({ page }) => {
    await page.goto("/");
    const slides = page.locator("[aria-roledescription=slide]");
    await expect(slides).toHaveCount(4);
    const current = page.locator("[aria-roledescription=slide][aria-hidden=false]");
    await expect(current).toHaveCount(1);
    const first = await current.getByRole("heading").textContent();
    // All headlines exist in the DOM even though only one is shown.
    await expect(page.getByRole("heading", { name: "Astheenapuram Heritage Walk – every Sunday", includeHidden: true })).toHaveCount(1);
    await expect(current.getByRole("heading")).not.toHaveText(first!, { timeout: 8000 });

    await page.getByRole("button", { name: "Show announcement 3" }).click();
    await page.getByRole("button", { name: "Pause announcements" }).click();
    const chosen = await current.getByRole("heading").textContent();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(7000);
    await expect(current.getByRole("heading")).toHaveText(chosen!);
    await expect(page.getByRole("button", { name: "Play announcements" })).toBeVisible();
  });

  test("[OTH-18] vanilla ticker: generated ids, duplicated items, pause on hover", async ({ page }) => {
    await page.goto("/");
    const items = page.locator(".tkr_item");
    await expect(items).toHaveCount(10);
    await expect(page.locator(".tkr_item:not([aria-hidden=true])")).toHaveCount(5);
    const ids = await items.evaluateAll((els) => els.map((e) => e.id));
    for (const id of ids) expect(id).toMatch(/^tkr-[a-z0-9]+-\d+$/);
    expect(await page.locator(".tkr_item", { hasText: "Ward Sabha" }).count()).toBe(2);
    await expect(page.getByRole("link", { name: /Ward Sabha meetings/ })).toHaveCount(1);
    const wrap = page.locator(".tkr_wrap");
    await expect(wrap).toHaveAttribute("data-state", "running");
    await page.locator(".tkr_viewport").hover();
    await expect(wrap).toHaveAttribute("data-state", "paused");
    const firstId = ids[0];
    await page.reload();
    await expect(items.first()).not.toHaveId(firstId);
  });
});
