import type { Page } from "@playwright/test";
import { test, expect, mockDelays } from "./fixtures";
import geo from "../src/mock/data/geo.json";

const URL = "/services/electricity/new-connection";
const pad = (n: number) => String(n).padStart(2, "0");
const daysFromNow = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const ddmmyyyy = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const pdf = (name: string, size = 2048) => ({ name, mimeType: "application/pdf", buffer: Buffer.alloc(size, 37) });

const next = (page: Page) => page.getByRole("button", { name: /Save & continue/ }).click();
const stepHeading = (page: Page, name: string | RegExp) => page.getByRole("heading", { level: 2, name });

async function step1(page: Page) {
  await page.getByRole("radio", { name: /Domestic/ }).check();
  await page.getByRole("radio", { name: "Single phase" }).check();
  await page.getByLabel("Sanctioned load required (kW)").fill("5");
  await next(page);
  await expect(stepHeading(page, "Applicant")).toBeVisible();
}
async function step2(page: Page) {
  await page.getByLabel("Applicant's full name").fill("Meena Rajendran");
  await page.getByLabel("Astheen ID").fill("482177306");
  await page.getByLabel("Mobile number").fill("9841023456");
  await next(page);
  await expect(stepHeading(page, "Premises")).toBeVisible();
}
async function step3(page: Page) {
  await page.getByLabel("Zone").selectOption({ label: "Zone II – Kalaivani" });
  await page.getByLabel("Ward").selectOption({ label: "Ward 14 – Kalaivani Nagar" });
  await expect(page.getByLabel("Street / Road")).toBeEnabled({ timeout: 6000 });
  await page.getByLabel("Street / Road").selectOption({ index: 1 });
  await page.getByLabel("Door / flat number").fill("12/4");
  await next(page);
  await expect(stepHeading(page, "Inspection & documents")).toBeVisible();
}
async function step4(page: Page) {
  const d = daysFromNow(3);
  await page.getByLabel("Preferred inspection date").fill(ddmmyyyy(d).replaceAll("/", ""));
  await page.locator("#idProof").setInputFiles(pdf("id-proof.pdf"));
  await page.locator("#ownershipProof").setInputFiles(pdf("sale-deed.pdf"));
  await next(page);
  await expect(stepHeading(page, "Review your application")).toBeVisible();
}
async function toReview(page: Page) { await step1(page); await step2(page); await step3(page); await step4(page); }

test.describe("New electricity connection", () => {
  test.beforeEach(async ({ context }) => {
    await mockDelays(context, { delays: { ZONE_LIST: 0, WARD_LIST: 0, STREET_LIST: 0 } });
  });

  test("[RAD-01] native radio group keeps a single selection across steps", async ({ page }) => {
    await page.goto(URL);
    const radios = page.locator("input[name=connectionType]");
    await expect(radios).toHaveCount(3);
    await page.getByRole("radio", { name: /Commercial/ }).check();
    await expect(page.getByRole("radio", { name: /Commercial/ })).toBeChecked();
    await page.getByRole("radio", { name: /Industrial/ }).check();
    await expect(page.getByRole("radio", { name: /Commercial/ })).not.toBeChecked();
    await expect(radios.and(page.locator(":checked"))).toHaveCount(1);
    await page.getByRole("radio", { name: "Three phase" }).check();
    await page.getByLabel("Sanctioned load required (kW)").fill("20");
    await next(page);
    await expect(stepHeading(page, "Applicant")).toBeVisible();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByRole("radio", { name: /Industrial/ })).toBeChecked();
  });

  test("[TXT-03] Astheen ID is masked and check-digit validated", async ({ page }) => {
    await page.goto(URL);
    await step1(page);
    const id = page.getByLabel("Astheen ID");
    await id.fill("4821abc7730");
    await expect(id).toHaveValue("ASP-4821-7730");
    await id.fill("ASP48217730612345");
    await expect(id).toHaveValue("ASP-4821-7730-6");
    await id.fill("482177305");
    await page.getByLabel("Applicant's full name").fill("Meena Rajendran");
    await page.getByLabel("Mobile number").fill("9841023456");
    await next(page);
    await expect(page.getByText("Enter a valid Astheen ID.")).toBeVisible();
    await expect(id).toHaveAttribute("aria-invalid", "true");
  });

  test("[DYN-04] new step is visible but not clickable while it slides in", async ({ page }) => {
    await page.goto(URL);
    await page.getByRole("radio", { name: /Domestic/ }).check();
    await page.getByRole("radio", { name: "Single phase" }).check();
    await page.getByLabel("Sanctioned load required (kW)").fill("5");
    await next(page);
    const probe = () => page.evaluate(() => {
      const el = document.getElementById("el-name")!;
      el.scrollIntoView({ block: "center" });
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { pe: getComputedStyle(el.closest("form > div")!).pointerEvents, hit: hit === el };
    });
    const during = await probe();
    expect(during).toEqual({ pe: "none", hit: false });
    await expect.poll(probe, { timeout: 2000 }).toEqual({ pe: "auto", hit: true });
  });

  test("[DRP-08] cascading selects load with delays and reset downstream", async ({ page, context }) => {
    await context.clearCookies();
    await mockDelays(context, { delays: { STREET_LIST: 1500 } });
    await page.goto(URL);
    await step1(page);
    await step2(page);
    const zone = page.getByLabel("Zone"), ward = page.getByLabel("Ward"), street = page.getByLabel("Street / Road");
    await expect(zone).toBeEnabled();
    await expect(ward).toBeDisabled();
    await expect(ward.locator("option")).toHaveText(["Select a zone first"]);
    await zone.selectOption({ label: "Zone II – Kalaivani" });
    await expect(ward).toBeDisabled();
    await expect(ward.locator("option")).toHaveText(["Loading wards…"]);
    await expect(ward).toBeEnabled({ timeout: 4000 });
    await expect(ward.locator("option")).toHaveCount(9);
    await ward.selectOption({ label: "Ward 14 – Kalaivani Nagar" });
    await expect(street.locator("option")).toHaveText(["Loading streets…"]);
    await expect(street).toBeEnabled({ timeout: 4000 });
    const streets = geo.streets.filter((s) => s.wardId === "W14");
    await street.selectOption({ label: streets[2].name });
    await expect(page.getByLabel("PIN code")).toHaveValue(streets[2].pincode);
    await zone.selectOption({ label: "Zone I – Thenmalai" });
    await expect(ward).toHaveValue("");
    await expect(street.locator("option")).toHaveText(["Select a ward first"]);
    await expect(page.getByLabel("PIN code")).toHaveValue("");
  });

  test("[DLG-07] nested tariff → glossary modals close one at a time", async ({ page }) => {
    await page.goto(URL);
    await page.getByRole("button", { name: "View tariff" }).click();
    const tariff = page.getByRole("dialog", { name: "Tariff schedule 2026–27" });
    await expect(tariff).toBeVisible();
    await expect(tariff.getByRole("cell", { name: "Free" })).toBeVisible();
    await tariff.getByRole("button", { name: "What is a slab?" }).click();
    const glossary = page.getByRole("dialog", { name: "Glossary" });
    await expect(glossary).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(2);
    const z = await Promise.all([tariff, glossary].map((d) => d.evaluate((el) => Number(getComputedStyle(el.parentElement!).zIndex))));
    expect(z[1]).toBeGreaterThan(z[0]);
    await page.keyboard.press("Escape");
    await expect(glossary).toHaveCount(0);
    await expect(tariff).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("[DAT-05] DD/MM/YYYY entry, ISO hidden value, range enforced", async ({ page }) => {
    await page.goto(URL);
    await step1(page); await step2(page); await step3(page);
    const date = page.getByLabel("Preferred inspection date");
    const ok = daysFromNow(5);
    await date.fill(ddmmyyyy(ok).replaceAll("/", ""));
    await expect(date).toHaveValue(ddmmyyyy(ok));
    await expect(page.locator("input[name=inspectionDate]")).toHaveValue(iso(ok));
    await date.fill(ddmmyyyy(daysFromNow(45)));
    await expect(page.locator("input[name=inspectionDate]")).toHaveValue(iso(daysFromNow(45)));
    await page.locator("#idProof").setInputFiles(pdf("a.pdf"));
    await page.locator("#ownershipProof").setInputFiles(pdf("b.pdf"));
    await next(page);
    await expect(page.getByText(/^Enter a valid date between/)).toBeVisible();
    await page.getByRole("button", { name: "Choose date from calendar" }).click();
    const cal = page.getByRole("dialog");
    const tomorrow = daysFromNow(1);
    await expect(cal.getByRole("button", { name: ddmmyyyy(tomorrow) })).toBeEnabled();
    const today = cal.getByRole("button", { name: ddmmyyyy(new Date()) });
    if (await today.count()) await expect(today).toBeDisabled();
    await cal.getByRole("button", { name: ddmmyyyy(tomorrow) }).click();
    await expect(date).toHaveValue(ddmmyyyy(tomorrow));
    await expect(page.locator("input[name=inspectionDate]")).toHaveValue(iso(tomorrow));
  });

  test("[FIL-02] display:none file input behind a styled button", async ({ page }) => {
    await page.goto(URL);
    await step1(page); await step2(page); await step3(page);
    const input = page.locator("#idProof");
    expect(await input.evaluate((el) => getComputedStyle(el).display)).toBe("none");
    await expect(input).toBeHidden();
    const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.getByRole("button", { name: "Choose file" }).first().click()]);
    await chooser.setFiles(pdf("aadhaar-front.pdf"));
    await expect(page.getByText("aadhaar-front.pdf")).toBeVisible();
    await page.locator("#ownershipProof").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("x") });
    await expect(page.getByRole("alert").filter({ hasText: "Only PDF, JPG or PNG files are accepted." })).toBeVisible();
    await page.locator("#ownershipProof").setInputFiles(pdf("big.pdf", 3 * 1024 * 1024));
    await expect(page.getByText("The file must be 2 MB or smaller.")).toBeVisible();
    await page.getByRole("button", { name: "Remove aadhaar-front.pdf" }).click();
    await expect(page.getByText("aadhaar-front.pdf")).toHaveCount(0);
  });

  test("[CHK-04] hidden declaration input: only the label is clickable", async ({ page }) => {
    await page.goto(URL);
    await toReview(page);
    const box = page.locator("#el-declare");
    await page.getByRole("button", { name: "Submit application" }).click();
    await expect(page.getByText("Please accept the declaration.")).toBeVisible();
    const size = await box.boundingBox();
    expect(size!.width).toBeLessThanOrEqual(1);
    await expect(box.click({ timeout: 1500 })).rejects.toThrow();
    await expect(box).not.toBeChecked();
    await page.locator("label[for=el-declare]").click();
    await expect(box).toBeChecked();
  });

  test("[BTN-05] Submit button moves when the estimate banner arrives", async ({ page }) => {
    await page.goto(URL);
    await step1(page); await step2(page); await step3(page);
    const d = daysFromNow(3);
    await page.getByLabel("Preferred inspection date").fill(ddmmyyyy(d).replaceAll("/", ""));
    await page.locator("#idProof").setInputFiles(pdf("a.pdf"));
    await page.locator("#ownershipProof").setInputFiles(pdf("b.pdf"));
    await next(page);
    const submit = page.getByRole("button", { name: "Submit application" });
    await expect(submit).toBeVisible();
    const before = (await submit.boundingBox())!.y;
    await expect(page.getByRole("heading", { name: "Estimated charges payable after inspection" })).toBeVisible({ timeout: 4000 });
    await page.waitForTimeout(100);
    const after = (await submit.boundingBox())!.y;
    expect(after - before).toBeGreaterThan(100);
    await expect(page.getByText("₹3,100.00")).toBeVisible(); // 5 kW × ₹300 + ₹1,500 + ₹100
  });

  test("[DLG-19] reference number is copied to the clipboard", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(URL);
    await toReview(page);
    await page.getByText(/I declare that the information/).click();
    await page.getByRole("button", { name: "Submit application" }).click();
    await expect(page.getByRole("heading", { name: "Application submitted" })).toBeVisible({ timeout: 6000 });
    const ref = (await page.locator("#el-ref").textContent())!;
    expect(ref).toMatch(/^AMC\/EL\/\d{4}\/\d{6}$/);
    await page.getByRole("button", { name: "Copy reference number" }).click();
    await expect(page.getByRole("button", { name: "Copy reference number" })).toHaveText(/Copied/);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(ref);
    await expect(page.getByRole("button", { name: "Copy reference number" })).toHaveText(/Copy$/, { timeout: 4000 });
    const apps = await page.evaluate(() => JSON.parse(localStorage.getItem("amc.applications") ?? "[]"));
    expect(apps[0]).toMatchObject({ ref, service: "electricity", status: "Submitted" });
  });
});
