import type { Locator, Page } from "@playwright/test";
import { test, expect, mockDelays } from "./fixtures";

const URL = "/services/property-tax/assess";
const MEENA = "014-002-00731"; // Ward 14, residential, built 2009: ground 850 self + first 620 rented

const FAST = {
  ASSESSMENT_DEBOUNCE: 0, ASSESSMENT_CHECK: 0, LOCALITY_PAGE: 0,
  GATEWAY_LOAD: 0, GATEWAY_OTP_SEND: 0, GATEWAY_OTP_VERIFY: 0, GATEWAY_RETURN: 0,
};

const status = (page: Page) => page.locator("#assessmentNo-status");
const list = (page: Page) => page.getByRole("listbox", { name: "Locality" });
const floorRow = (page: Page, floor: string) =>
  page.locator("#pt-floors tbody tr", { has: page.getByRole("rowheader", { name: floor, exact: true }) });

async function verify(page: Page, no = MEENA) {
  await page.getByLabel("Assessment number").fill(no);
  await expect(status(page)).toContainText("Property found");
}

/** DRP-06: scroll the listbox until the option exists, then click it. */
async function chooseLocality(page: Page, name: RegExp) {
  const button = page.locator("#pt-locality");
  if ((await button.getAttribute("aria-expanded")) !== "true") await button.click();
  const lb = list(page);
  await expect(lb.getByRole("option").first()).toBeVisible();
  for (let i = 0; i < 6; i++) {
    const option = lb.getByRole("option", { name });
    if (await option.count()) return option.click();
    const n = await lb.getByRole("option").count();
    await lb.evaluate((el) => (el.scrollTop = el.scrollHeight));
    await expect(lb.getByRole("option")).not.toHaveCount(n);
  }
  throw new Error(`locality ${name} not found`);
}

async function fillForm(page: Page) {
  await page.goto(URL);
  await verify(page);
  await chooseLocality(page, /^Kalaivani Nagar/);
}

const visibleProceed = (page: Page): Locator => page.getByRole("button", { name: "Proceed to pay" });

test.describe("Property tax self-assessment", () => {
  test("[TXT-13] assessment number is verified only after a pause in typing", async ({ page, context }) => {
    await mockDelays(context, { delays: { ...FAST, ASSESSMENT_DEBOUNCE: 500, ASSESSMENT_CHECK: 1000 } });
    await page.goto(URL);
    const input = page.getByLabel("Assessment number");
    await input.pressSequentially(MEENA, { delay: 30 });
    // Immediately after typing: no verdict yet.
    await expect(status(page)).toHaveText("");
    await expect(status(page)).toContainText("Verifying assessment number…");
    await expect(status(page)).toContainText("Meena Rajendran");
    await expect(page.getByRole("radio", { name: "Residential" })).toBeChecked();

    // Proceeding while a new number is still being verified is refused.
    await input.fill("003-001-01208");
    await expect(status(page)).toContainText("Verifying");
    await visibleProceed(page).click();
    await expect(page.getByRole("alert").first()).toContainText("still being verified");
    await expect(status(page)).toContainText("Arulmozhi Kannan");

    await input.fill("999-999-99999");
    await expect(status(page)).toContainText("No property is registered under this assessment number");
    await input.fill("12-34");
    await expect(status(page)).toContainText("format NNN-NNN-NNNNN");
    await expect(input).toHaveAttribute("aria-invalid", "true");
  });

  test("[DRP-06] locality options load ten at a time as the list scrolls", async ({ page, context }) => {
    await mockDelays(context, { delays: { ...FAST, LOCALITY_PAGE: 400 } });
    await page.goto(URL);
    await expect(page.locator("select#pt-locality")).toHaveCount(0);
    await page.locator("#pt-locality").click();
    const lb = list(page);
    await expect(lb).toContainText("Loading localities…");
    await expect(lb.getByRole("option")).toHaveCount(10);
    await expect(lb.getByRole("option", { name: /Pavala Nagar/ })).toHaveCount(0);

    await lb.evaluate((el) => (el.scrollTop = el.scrollHeight));
    await expect(lb).toContainText("Loading more localities…");
    await expect(lb.getByRole("option")).toHaveCount(20);

    await chooseLocality(page, /^Pavala Nagar/);
    await expect(page.locator("#pt-locality")).toContainText("Pavala Nagar (Ward 48)");
    await page.locator("#pt-locality").click();
    await expect(list(page).getByRole("option")).toHaveCount(48);
    await expect(list(page).getByRole("option", { name: /Pavala Nagar/ })).toHaveAttribute("aria-selected", "true");
  });

  test("[RAD-03] usage segments are native radios", async ({ page, context }) => {
    await mockDelays(context, { delays: FAST });
    await fillForm(page);
    await expect(page.locator("input[type=radio][name=usageType]")).toHaveCount(3);
    await expect(page.getByRole("button", { name: "Commercial" })).toHaveCount(0);
    await expect(page.locator("#pt-uav")).toHaveText("₹3.10 / sq ft / month");
    await page.getByLabel("Commercial").check();
    await expect(page.getByRole("radio", { name: "Commercial" })).toBeChecked();
    await expect(page.getByRole("radio", { name: "Residential" })).not.toBeChecked();
    await expect(page.locator("#pt-uav")).toHaveText("₹7.75 / sq ft / month");
  });

  test("[OTH-01] building age is a native range slider", async ({ page, context }) => {
    await mockDelays(context, { delays: FAST });
    await fillForm(page);
    const slider = page.getByLabel("Age of the building");
    await expect(slider).toHaveAttribute("type", "range");
    await expect(page.locator("#pt-age-value")).toHaveText(`${new Date().getFullYear() - 2009} years`);
    await slider.fill("30");
    await expect(page.locator("#pt-age-value")).toHaveText("30 years");
    await expect(page.locator("#pt-age-help")).toContainText("Depreciation allowed: 20%");
    await expect(page.getByRole("complementary")).toContainText("Less depreciation (20%)");
    await slider.focus();
    await slider.press("End");
    await expect(page.locator("#pt-age-value")).toHaveText("80 years");
  });

  test("[TBL-05] floor cells become editors only while editing", async ({ page, context }) => {
    await mockDelays(context, { delays: FAST });
    await fillForm(page);
    const table = page.locator("#pt-floors");
    await expect(table.locator("input, select")).toHaveCount(0);
    const first = floorRow(page, "First floor");
    await expect(first.locator("td").nth(2)).toHaveText("₹34,596.00");
    await expect(table.locator("tfoot")).toContainText("₹66,216.00");

    await first.locator("td").first().click();
    const editor = page.getByLabel("Plinth area of the First floor in sq ft");
    await expect(editor).toHaveValue("620");
    await editor.fill("10");
    await editor.press("Enter");
    await expect(first).toContainText("Enter a whole number from 50 to 20,000.");
    await editor.fill("700");
    await editor.press("Enter");
    await expect(table.locator("input")).toHaveCount(0);
    await expect(first.locator("td").first()).toHaveText("700");
    await expect(first.locator("td").nth(2)).toHaveText("₹39,060.00");

    // Escape discards.
    await first.locator("td").first().click();
    await editor.fill("900");
    await editor.press("Escape");
    await expect(first.locator("td").first()).toHaveText("700");

    // Occupancy cell opens a select that commits on change.
    await first.locator("td").nth(1).click();
    await page.getByLabel("Occupancy of the First floor").selectOption({ label: "Self-occupied" });
    await expect(first.locator("td").nth(1)).toHaveText("Self-occupied");
    await expect(first.locator("td").nth(2)).toHaveText("₹26,040.00");

    // A new floor opens its area editor straight away.
    await page.getByRole("button", { name: "Add a floor" }).click();
    await page.getByLabel("Plinth area of the Second floor in sq ft").fill("400");
    await page.keyboard.press("Enter");
    await expect(floorRow(page, "Second floor").locator("td").first()).toHaveText("400");
  });

  test("[DLG-02] removing a floor asks with a native confirm", async ({ page, context }) => {
    await mockDelays(context, { delays: FAST });
    await fillForm(page);
    const rows = page.locator("#pt-floors tbody tr");
    await expect(rows).toHaveCount(2);

    let message = "";
    page.once("dialog", (d) => {
      expect(d.type()).toBe("confirm");
      message = d.message();
      void d.dismiss();
    });
    await page.getByRole("button", { name: "Remove First floor" }).click();
    await expect(rows).toHaveCount(2);
    expect(message).toContain("Remove the First floor from this assessment?");

    page.once("dialog", (d) => void d.accept());
    await page.getByRole("button", { name: "Remove First floor" }).click();
    await expect(rows).toHaveCount(1);
    await expect(page.locator("#pt-floors tfoot")).toContainText("₹31,620.00");
    await expect(page.getByRole("button", { name: /^Remove/ })).toHaveCount(0);
  });

  test("[CHK-03] rebates are div checkboxes with aria-checked", async ({ page, context }) => {
    await mockDelays(context, { delays: FAST });
    await fillForm(page);
    const group = page.getByRole("group", { name: "4. Rebates" });
    await expect(group.locator("input[type=checkbox]")).toHaveCount(0);
    const senior = page.getByRole("checkbox", { name: /senior citizen/ });
    await expect(senior).toHaveAttribute("aria-checked", "false");
    await senior.check();
    await expect(senior).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("complementary")).toContainText("Less rebates (5%)");
    await expect(page.locator("#pt-payable")).toHaveText("₹2,831.00");
    await senior.press("Enter");
    await expect(senior).toBeChecked();
    await senior.press("Space");
    await expect(senior).not.toBeChecked();
    await expect(page.locator("#pt-payable")).toHaveText("₹2,980.00");
  });

  test("[DLG-12] unit area value tooltip exists only while hovered", async ({ page, context }) => {
    await mockDelays(context, { delays: FAST });
    await fillForm(page);
    const info = page.getByRole("button", { name: "About the unit area value" });
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    await info.hover();
    const tip = page.getByRole("tooltip");
    await expect(tip).toContainText("Kalaivani Nagar base rate ₹3.10 × 1 for Residential");
    await expect(info).toHaveAttribute("aria-describedby", (await tip.getAttribute("id"))!);
    await page.mouse.move(0, 0);
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    await info.focus();
    await expect(page.getByRole("tooltip")).toBeVisible();
    await info.press("Escape");
    await expect(page.getByRole("tooltip")).toHaveCount(0);
  });

  test("[BTN-10] two Proceed to pay buttons, one visible per viewport; pay through AstheenPay", async ({ page, context }) => {
    await mockDelays(context, { delays: FAST });
    await fillForm(page);
    const all = page.locator("button", { hasText: "Proceed to pay" });
    await expect(all).toHaveCount(2);
    await expect(all.first()).toBeHidden();
    await expect(all.nth(1)).toBeVisible();
    await expect(visibleProceed(page)).toHaveCount(1);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(all.first()).toBeVisible();
    await expect(all.nth(1)).toBeHidden();
    await all.first().click();
    await expect(page.getByRole("alert").first()).toContainText("Choose how you want to pay.");

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole("radio", { name: /^UPI/ }).check();
    await visibleProceed(page).click();
    const frame = page.frameLocator("#astheenpay-frame");
    await expect(frame.locator("dl")).toContainText(`(assessment ${MEENA})`);
    await expect(frame.locator("dl")).toContainText("Property tax, ");
    await expect(frame.locator("dl")).toContainText("₹2,980.00");
    await frame.getByLabel("UPI ID").fill("meena@okastheen");
    await frame.getByRole("button", { name: "Pay ₹2,980.00" }).click();
    const otp = await page.evaluate(() => /(\d{6})/.exec(JSON.parse(localStorage.getItem("amc.sms") ?? "[]")[0]?.body ?? "")?.[1] ?? "");
    const dialog = frame.getByRole("dialog", { name: "Enter OTP" });
    await dialog.getByLabel("One-time password").fill(otp);
    await dialog.getByRole("button", { name: "Verify and pay" }).click();

    const receipt = page.getByRole("region", { name: "Property tax paid" });
    await expect(receipt).toBeVisible();
    await expect(receipt).toContainText(MEENA);
    await expect(receipt.locator("dd").first()).toHaveText(/^AMC\/PT\/\d{4}\/\d{6}$/);

    // The same half-year cannot be paid twice from this browser.
    await page.reload();
    await page.getByLabel("Assessment number").fill(MEENA);
    await expect(status(page)).toContainText("Already paid for this half-year");
  });
});
