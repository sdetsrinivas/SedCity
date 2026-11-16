import fs from "node:fs";
import type { FrameLocator, Page } from "@playwright/test";
import { test, expect, mockDelays, seedSession, USERS } from "./fixtures";

const MEENA = "W02-014-00731"; // ₹332.50, domestic
const URL = `/services/water/pay?ref=${MEENA}`;

const FAST = {
  CONSUMER_LOOKUP: 0, PAY_OVERLAY: 0, GATEWAY_LOAD: 0, GATEWAY_OTP_SEND: 0, GATEWAY_OTP_VERIFY: 0, GATEWAY_RETURN: 0,
};

type Ctx = FrameLocator | Page;

/** Opens the bill and waits for the payment options overlay to clear. */
async function openOptions(page: Page) {
  await page.goto(URL);
  await expect(page.locator("#pay-options")).toHaveAttribute("aria-busy", "false");
}

async function chooseAndProceed(page: Page, method: RegExp) {
  await page.getByRole("radio", { name: method }).click();
  await page.getByRole("button", { name: "Proceed to pay" }).click();
}

/** The OTP from the latest SMS (same origin, so the page can read what the checkout stored). */
const latestOtp = (page: Page) =>
  page.evaluate(() => /(\d{6})/.exec(JSON.parse(localStorage.getItem("amc.sms") ?? "[]")[0]?.body ?? "")?.[1] ?? "");

async function fillCard(ctx: Ctx) {
  await ctx.getByLabel("Card number").fill("4111111111111111");
  await ctx.getByLabel("Name on card").fill("MEENA RAJENDRAN");
  await ctx.getByLabel("Expiry (MM/YY)").fill("1230");
  await ctx.getByLabel("CVV").fill("123");
}

async function enterOtp(ctx: Ctx, page: Page) {
  const dialog = ctx.getByRole("dialog", { name: "Enter OTP" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("One-time password").fill(await latestOtp(page));
  await dialog.getByRole("button", { name: "Verify and pay" }).click();
}

const receipt = (page: Page) => page.getByRole("region", { name: "Payment successful" });

test.describe("Water bill payment", () => {
  test("[OTH-02] partial-payment slider by keyboard and by dragging", async ({ page, context }) => {
    await mockDelays(context, { delays: FAST });
    await openOptions(page);
    const slider = page.getByRole("slider", { name: "Amount to pay" });
    await expect(slider).toHaveAttribute("aria-valuenow", "332.5");
    await expect(page.locator("input[type=range]")).toHaveCount(0);

    await slider.press("Home");
    await expect(slider).toHaveAttribute("aria-valuenow", "100");
    await slider.press("ArrowRight");
    await expect(slider).toHaveAttribute("aria-valuenow", "110");
    await slider.press("End");
    await slider.press("ArrowLeft");
    await expect(slider).toHaveAttribute("aria-valuenow", "330");
    await expect(page.locator("#wt-paying")).toContainText("₹330.00 of ₹332.50");
    await expect(page.locator("#wt-paying")).toContainText("Balance carried forward: ₹2.50");
    await expect(page.locator("#wt-charge-total")).toHaveText("₹330.00");

    // Drag the thumb to the middle of the track: snaps to a ₹10 step.
    const track = (await slider.locator("..").boundingBox())!;
    const thumb = (await slider.boundingBox())!;
    await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2);
    await page.mouse.down();
    await page.mouse.move(track.x + track.width * 0.5, track.y + track.height / 2, { steps: 8 });
    await page.mouse.up();
    const v = Number(await slider.getAttribute("aria-valuenow"));
    expect(v % 10).toBe(0);
    expect(v).toBeGreaterThanOrEqual(200);
    expect(v).toBeLessThanOrEqual(240);
    // A plain fill does not work on a div slider.
    await expect(slider.fill("200")).rejects.toThrow();
  });

  test("[RAD-02] payment method cards use roving tabindex and aria-checked", async ({ page, context }) => {
    await mockDelays(context, { delays: FAST });
    await openOptions(page);
    const options = page.locator("#pay-options");
    await expect(options.locator("input[type=radio]")).toHaveCount(0);
    const radios = page.getByRole("radio");
    await expect(radios).toHaveCount(3);
    await expect(options.locator("[role=radio][tabindex='0']")).toHaveCount(1);

    await page.getByRole("button", { name: "Proceed to pay" }).click();
    await expect(page.getByText("Choose a payment method.")).toBeVisible();

    const card = page.getByRole("radio", { name: /Debit \/ credit card/ });
    await card.click();
    await expect(card).toBeChecked();
    await expect(options).toHaveAttribute("aria-busy", "false");
    await card.press("ArrowRight");
    const upi = page.getByRole("radio", { name: /UPI/ });
    await expect(upi).toBeChecked();
    await expect(upi).toBeFocused();
    await expect(card).toHaveAttribute("aria-checked", "false");
    await expect(options.locator("[role=radio][tabindex='0']")).toHaveText(/UPI/);
    await expect(page.locator("#pay-options dl")).toContainText("Convenience fee₹0.00");
  });

  test("[CHK-02] email-receipt box is ticked via the property, never the attribute", async ({ page, context }) => {
    await mockDelays(context, { delays: FAST });
    await seedSession(context, "meena");
    await openOptions(page);
    const box = page.getByLabel("Email me the payment receipt");
    await expect(box).toBeChecked();
    expect(await box.getAttribute("checked")).toBeNull();
    await expect(page.locator("#emailReceipt[checked]")).toHaveCount(0);
    await expect(page.getByLabel("Email address")).toHaveValue(USERS.meena.email);

    await box.uncheck();
    await expect(box).not.toBeChecked();
    await expect(page.getByLabel("Email address")).toHaveCount(0);
    await box.check();
    expect(await box.getAttribute("checked")).toBeNull();
  });

  test("[CHK-02] email-receipt box is unticked for anonymous visitors", async ({ page, context }) => {
    await mockDelays(context, { delays: FAST });
    await openOptions(page);
    await expect(page.getByLabel("Email me the payment receipt")).not.toBeChecked();
    await expect(page.getByLabel("Email address")).toHaveCount(0);
  });

  test("[BTN-04] Proceed to pay is covered by an overlay until checks finish", async ({ page, context }) => {
    await mockDelays(context, { delays: { ...FAST, PAY_OVERLAY: 2500 } });
    await page.goto(URL);
    const proceed = page.getByRole("button", { name: "Proceed to pay" });
    const overlay = page.locator("#pay-options [role=status]");
    await expect(overlay).toHaveText("Checking for pending transactions on this connection…");
    await expect(proceed).toBeVisible();
    await expect(proceed).toBeEnabled();

    const hit = await proceed.evaluate((b) => {
      const r = b.getBoundingClientRect();
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return top === b || b.contains(top);
    });
    expect(hit).toBe(false);
    // A forced click lands on the overlay: no validation message, nothing happens.
    await proceed.click({ force: true });
    await expect(page.getByText("Choose a payment method.")).toHaveCount(0);

    await expect(overlay).toHaveCount(0, { timeout: 5000 });
    await page.getByRole("radio", { name: /UPI/ }).click();
    await expect(overlay).toHaveText("Updating convenience fee…");
    await proceed.click(); // auto-waits until the overlay is gone
    await expect(page.locator("#astheenpay-frame")).toBeVisible();
  });

  test("[FRM-01] card payment inside the same-origin AstheenPay iframe", async ({ page, context }) => {
    await mockDelays(context, { delays: { ...FAST, GATEWAY_LOAD: 1000, GATEWAY_RETURN: 800 } });
    await openOptions(page);
    await chooseAndProceed(page, /Debit \/ credit card/);
    const frame = page.frameLocator("#astheenpay-frame");
    await expect(frame.getByText("Connecting securely…")).toBeVisible();
    await expect(frame.getByText("Total payable")).toBeVisible();
    await expect(frame.locator("dl")).toContainText("₹335.83"); // 332.50 + 1% fee
    await expect(page.getByLabel("Card number")).toHaveCount(0);

    await fillCard(frame);
    await frame.getByRole("button", { name: "Pay ₹335.83" }).click();
    await enterOtp(frame, page);
    await expect(frame.getByText("Returning to Astheenapuram Municipal Corporation…")).toBeVisible();

    await expect(receipt(page)).toBeVisible();
    await expect(page.locator("#astheenpay-frame")).toHaveCount(0);
    const txn = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem("amc.paySessions")!) as Record<string, { txnId?: string }>)[0].txnId);
    expect(txn).toMatch(/^APY\d{12}$/);
    await expect(receipt(page)).toContainText(txn!);
    await expect(receipt(page)).toContainText("•••• 1111");
  });

  test("[TXT-12] floating labels: no placeholder text, label moves on focus", async ({ page, context }) => {
    await mockDelays(context, { delays: FAST });
    await openOptions(page);
    await chooseAndProceed(page, /Debit \/ credit card/);
    const frame = page.frameLocator("#astheenpay-frame");
    const input = frame.getByLabel("Card number");
    await expect(input).toBeVisible();
    await expect(frame.getByPlaceholder("Card number")).toHaveCount(0);
    expect(await input.getAttribute("placeholder")).toBe(" ");

    const label = frame.locator("label[for=ap-card]");
    const before = (await label.boundingBox())!.y;
    await input.focus();
    await expect.poll(async () => (await label.boundingBox())!.y).toBeLessThan(before - 4);
    await input.pressSequentially("4111111111111111");
    await expect(input).toHaveValue("4111 1111 1111 1111");
    await frame.getByLabel("Expiry (MM/YY)").fill("0330");
    await expect(frame.getByLabel("Expiry (MM/YY)")).toHaveValue("03/30");

    await frame.getByRole("button", { name: /^Pay / }).click();
    await expect(frame.getByText("Enter the name as printed on the card.")).toBeVisible();
    await expect(frame.getByLabel("Name on card")).toHaveAttribute("aria-invalid", "true");
  });

  test("[DLG-08] OTP dialog lives inside the iframe", async ({ page, context }) => {
    await mockDelays(context, { delays: { ...FAST, GATEWAY_OTP_SEND: 600 } });
    await openOptions(page);
    await chooseAndProceed(page, /Debit \/ credit card/);
    const frame = page.frameLocator("#astheenpay-frame");
    await fillCard(frame);
    await frame.getByRole("button", { name: /^Pay / }).click();
    await expect(frame.getByRole("button", { name: "Sending OTP…" })).toBeVisible();

    const dialog = frame.getByRole("dialog", { name: "Enter OTP" });
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(dialog).toContainText("ending 2345");

    const otp = await latestOtp(page);
    await dialog.getByLabel("One-time password").fill(otp === "000000" ? "111111" : "000000");
    await dialog.getByRole("button", { name: "Verify and pay" }).click();
    await expect(dialog.getByRole("alert")).toHaveText("The OTP is incorrect. Please check the SMS and try again.");

    await dialog.getByLabel("One-time password").fill(otp);
    await dialog.getByRole("button", { name: "Verify and pay" }).click();
    await expect(receipt(page)).toBeVisible();
  });

  test("[DLG-15] pay by UPI in a popup window that closes itself", async ({ page, context }) => {
    await mockDelays(context, { delays: { ...FAST, GATEWAY_RETURN: 500 } });
    await openOptions(page);
    await chooseAndProceed(page, /UPI/);
    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      page.getByRole("button", { name: "Open in a new window" }).click(),
    ]);
    expect(popup.url()).toContain("/pay/astheenpay/checkout?session=");
    expect(popup.url()).toContain("view=window");
    await expect(page.locator("#astheenpay-frame")).toHaveCount(0);
    await expect(page.getByText("Complete the payment in the AstheenPay window.")).toBeVisible();

    await popup.getByLabel("UPI ID").fill("meena@okastheen");
    const closed = popup.waitForEvent("close");
    await popup.getByRole("button", { name: "Pay ₹332.50" }).click();
    await enterOtp(popup, popup);
    await closed;
    await expect(receipt(page)).toBeVisible();
    await expect(receipt(page)).toContainText("meena@okastheen");
  });

  test("[DLG-15] closing the popup before paying returns to the options", async ({ page, context }) => {
    await mockDelays(context, { delays: FAST });
    await openOptions(page);
    await chooseAndProceed(page, /UPI/);
    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      page.getByRole("button", { name: "Open in a new window" }).click(),
    ]);
    await expect(popup.getByLabel("UPI ID")).toBeVisible();
    await popup.close();
    await expect(page.getByRole("status").filter({ hasText: "The payment window was closed" })).toBeVisible();
    await expect(page.locator("#pay-options")).toBeVisible();
    const statuses = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem("amc.paySessions")!) as Record<string, { status: string }>).map((s) => s.status));
    expect(statuses).toEqual(["cancelled"]);
  });

  test("[FIL-05] receipt downloads as a PDF named after the receipt number", async ({ page, context }) => {
    await mockDelays(context, { delays: FAST });
    await openOptions(page);
    await chooseAndProceed(page, /Net banking/);
    const frame = page.frameLocator("#astheenpay-frame");
    await frame.getByLabel("Your bank").selectOption({ label: "Kaveri Valley Bank" });
    await frame.getByRole("button", { name: "Pay ₹342.50" }).click();
    await enterOtp(frame, page);
    await expect(receipt(page)).toBeVisible();

    const receiptNo = (await receipt(page).locator("dd").first().textContent())!;
    expect(receiptNo).toMatch(/^AMC\/WT\/\d{4}\/\d{6}$/);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download receipt (PDF)" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe(`${receiptNo.replaceAll("/", "-")}-receipt.pdf`);
    const pdf = fs.readFileSync((await download.path())!, "latin1");
    expect(pdf.startsWith("%PDF-")).toBe(true);
    expect(pdf).toContain(`Receipt No. ${receiptNo}`);
    expect(pdf).toContain("Kaveri Valley Bank");

    // The bill now shows as paid on a fresh lookup.
    await page.getByLabel("Consumer number").fill(MEENA);
    await page.getByRole("button", { name: "Fetch bill" }).click();
    await expect(page.getByRole("region", { name: "Bill details" })).toContainText("No amount is due");
    await expect(page.locator("#pay-options")).toHaveCount(0);
  });
});
