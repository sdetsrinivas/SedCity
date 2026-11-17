import type { Page } from "@playwright/test";
import { test, expect, mockDelays } from "./fixtures";

const URL = "/certificates/birth";
const PDF = { name: "discharge.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(4096) };

/** Local ISO date in the browser, `offset` days from today (the page uses the same clock). */
const browserDate = (page: Page, offset = 0) =>
  page.evaluate((o) => {
    const d = new Date();
    d.setDate(d.getDate() + o);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, offset);

const ddmmyyyy = (iso: string) => iso.split("-").reverse().join("/");

async function fillValid(page: Page, dob: string) {
  await page.getByLabel("Child's name").fill("Kavin Arul");
  await page.getByLabel("Male", { exact: true }).check();
  await page.getByLabel("Date of birth").fill(dob);
  await page.getByLabel("Hospital or place of birth").selectOption({ label: "AMC Maternity Hospital, Kalaivani Nagar" });
  await page.getByLabel("Mother's name").fill("Divya Arul");
  await page.getByRole("group", { name: "Who is applying?" }).getByRole("radio", { name: "Mother or father" }).check();
  await page.getByLabel("Applicant's name").fill("Arul Kumar");
  await page.getByLabel("Mobile number").fill("9840012345");
  await page.getByLabel("Proof of birth").setInputFiles(PDF);
}

const submit = (page: Page) => page.getByRole("button", { name: "Submit application" }).click();
const summary = (page: Page) => page.getByRole("alert").filter({ hasText: "Please correct the following:" });

test.describe("Birth certificate", () => {
  test.beforeEach(async ({ context }) => {
    await mockDelays(context, { delays: { BIRTH_SUBMIT: 0 } });
  });

  test("[TXT-10] child's name stops at 40 characters; a script can go past it but the form refuses", async ({ page }) => {
    await page.goto(URL);
    const name = page.getByLabel("Child's name");
    await expect(name).toHaveAttribute("maxlength", "40");
    const long = "Baby of Thenmozhi Ramalingam Sundaravadivel"; // 43 characters
    await name.fill(long);
    await expect(name).toHaveValue(long.slice(0, 40));
    await expect(page.getByText("40 / 40 characters")).toBeVisible();
    await name.fill("");
    await name.pressSequentially(long);
    await expect(name).toHaveValue(long.slice(0, 40));

    // maxlength only limits typing: a value set from script keeps all 43 characters and is not "tooLong".
    const validity = await name.evaluate((el: HTMLInputElement, v) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return { length: el.value.length, tooLong: el.validity.tooLong };
    }, long);
    expect(validity).toEqual({ length: 43, tooLong: false });
    await expect(page.getByText("43 / 40 characters")).toBeVisible();
    await submit(page);
    await expect(summary(page)).toContainText("The child's name can have at most 40 characters.");
  });

  test("[DAT-01] date of birth is a native date input that only takes ISO values", async ({ page }) => {
    await page.goto(URL);
    const dob = page.getByLabel("Date of birth");
    const today = await browserDate(page);
    await expect(dob).toHaveAttribute("type", "date");
    await expect(dob).toHaveAttribute("min", "1950-01-01");
    await expect(dob).toHaveAttribute("max", today);

    // A DD/MM/YYYY string is not a valid value: the field stays empty (Playwright 1.65 does not throw).
    await dob.fill(ddmmyyyy(today)).catch(() => {});
    await expect(dob).toHaveValue("");

    const tenDaysAgo = await browserDate(page, -10);
    await dob.fill(tenDaysAgo);
    await expect(dob).toHaveValue(tenDaysAgo);

    // max does not stop a value from being set; the form rejects it.
    const tomorrow = await browserDate(page, 1);
    await dob.fill(tomorrow);
    await expect(dob).toHaveValue(tomorrow);
    expect(await dob.evaluate((el: HTMLInputElement) => el.validity.rangeOverflow)).toBe(true);
    await submit(page);
    await expect(summary(page)).toContainText("The date of birth cannot be in the future.");

    await fillValid(page, tenDaysAgo);
    await page.getByLabel(/Collect from the zonal office/).check();
    await submit(page);
    // Shown back as DD/MM/YYYY.
    await expect(page.getByRole("heading", { name: "Application submitted" })).toBeVisible();
    await expect(page.getByText(ddmmyyyy(tenDaysAgo), { exact: true })).toBeVisible();
  });

  test("[DRP-01] hospital is a native select whose values are codes", async ({ page }) => {
    await page.goto(URL);
    const select = page.getByLabel("Hospital or place of birth");
    expect(await select.evaluate((el) => el.tagName)).toBe("SELECT");
    await expect(select.locator("option")).toHaveCount(12);
    await expect(select).toHaveValue("");

    await select.selectOption({ label: "Kaveri Women and Child Hospital, Lake Road" });
    await expect(select).toHaveValue("H05");
    await select.selectOption("H07");
    await expect(select.locator("option:checked")).toHaveText("St. Agnes Mission Hospital, Church Street");

    await expect(page.getByLabel("Address of the place of birth")).toHaveCount(0);
    await select.selectOption({ label: "Other place (home or elsewhere)" });
    await expect(select).toHaveValue("OTHER");
    await expect(page.getByLabel("Address of the place of birth")).toBeVisible();
  });

  test("[FIL-01] proof of birth is a visible native file input", async ({ page }) => {
    await page.goto(URL);
    const file = page.getByLabel("Proof of birth");
    await expect(file).toBeVisible();
    await expect(file).toHaveAttribute("type", "file");
    await expect(file).toHaveAttribute("accept", ".pdf,.jpg,.jpeg,.png");

    // accept only filters the OS dialog; the page checks what it receives.
    await file.setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("x") });
    await expect(page.getByRole("alert").filter({ hasText: "notes.txt" })).toHaveText("notes.txt: only PDF, JPG or PNG files can be attached.");
    expect(await file.evaluate((el: HTMLInputElement) => el.files!.length)).toBe(0);

    await file.setInputFiles({ name: "scan.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(3 * 1024 * 1024) });
    await expect(page.getByRole("alert").filter({ hasText: "scan.jpg" })).toHaveText("scan.jpg: the file is larger than 2 MB.");

    await file.setInputFiles(PDF);
    await expect(page.locator("#bc-proof-name")).toHaveText("Attached: discharge.pdf (4 KB)");
    expect(await file.evaluate((el: HTMLInputElement) => el.files![0].name)).toBe("discharge.pdf");
  });

  test("[RAD-04] two radio groups share name=type and values 1–3 in separate forms", async ({ page }) => {
    await page.goto(URL);
    const all = page.locator("input[type=radio][name=type]");
    await expect(all).toHaveCount(6);
    expect(await all.evaluateAll((els) => new Set(els.map((e) => (e as HTMLInputElement).form)).size)).toBe(2);
    await expect(page.locator("input[name=type][value='2']")).toHaveCount(2);

    // The first match for value 2 is the applicant's "Legal guardian", not "Speed Post".
    await page.locator("input[name=type][value='2']").first().check();
    await expect(page.getByLabel("Legal guardian")).toBeChecked();
    await expect(page.getByLabel(/Speed Post/)).not.toBeChecked();
    await expect(page.getByLabel("Postal address")).toHaveCount(0);

    // Scoped to the delivery form, the same selector picks Speed Post; both groups stay checked.
    const delivery = page.getByRole("form", { name: "4. Certificate delivery" });
    await delivery.locator("input[name=type][value='2']").check();
    await expect(page.getByLabel(/Speed Post/)).toBeChecked();
    await expect(page.getByLabel("Legal guardian")).toBeChecked();
    await expect(page.locator("input[name=type]:checked")).toHaveCount(2);
    await expect(page.getByLabel("Postal address")).toBeVisible();

    // Role locators scoped by the group name are unambiguous.
    await page.getByRole("group", { name: "How would you like to receive the certificate?" }).getByRole("radio", { name: /Digitally signed copy/ }).check();
    await expect(page.getByLabel("Email address")).toBeVisible();
    await page.getByRole("group", { name: "Who is applying?" }).getByRole("radio", { name: "Mother or father" }).check();
    expect(await page.evaluate(() => [...document.querySelectorAll<HTMLInputElement>("input[name=type]:checked")].map((r) => r.value))).toEqual(["1", "3"]);
  });

  test("[RAD-04] the delivery choice is required and saved", async ({ page }) => {
    await page.goto(URL);
    await fillValid(page, await browserDate(page, -3));
    await page.locator("input[name=type][value='2']").first().check(); // the applicant group
    await submit(page);
    await expect(summary(page)).toContainText("Select how you would like to receive the certificate.");

    const delivery = page.getByRole("form", { name: "4. Certificate delivery" });
    await delivery.getByLabel(/Speed Post/).check();
    await delivery.getByLabel("Postal address").fill("12, Thendral Street, Ward 14");
    await delivery.getByLabel("PIN code").fill("641014");
    await expect(page.locator("#bc-fee")).toHaveText("₹90.00");
    await submit(page);
    await expect(page.getByRole("heading", { name: "Application submitted" })).toBeVisible();
    const ref = (await page.locator("#bc-ref").textContent())!;
    expect(ref).toMatch(/^AMC\/BC\/\d{4}\/\d{6}$/);
    const apps = JSON.parse((await page.evaluate(() => localStorage.getItem("amc.applications")))!);
    expect(apps[0]).toMatchObject({ ref, service: "birth", amount: 90, details: { applicantType: "2", delivery: "2", hospital: "H02", proof: "discharge.pdf" } });
  });

  test("[DLG-04] leaving with unsaved changes raises a beforeunload prompt", async ({ page }) => {
    await page.goto(URL);
    const seen: string[] = [];
    page.on("dialog", async (d) => { seen.push(d.type()); await d.accept(); });

    // A script-dispatched, cancelable beforeunload event reports whether the page would ask (works from any driver).
    const wouldAsk = () => page.evaluate(() => { const e = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; });

    // Nothing entered yet: no prompt.
    expect(await wouldAsk()).toBe(false);
    await page.reload();
    expect(seen).toEqual([]);

    await page.getByLabel("Child's name").fill("Kavin");
    expect(await wouldAsk()).toBe(true);
    await page.reload();
    await expect.poll(() => seen).toEqual(["beforeunload"]);
    // Accepted: the page reloaded and the entry is gone.
    await expect(page.getByLabel("Child's name")).toHaveValue("");
  });

  test("[DLG-04] dismissing the prompt keeps the page and what was entered", async ({ page }) => {
    await page.goto(URL);
    await page.getByLabel("Mother's name").fill("Divya Arul");
    const seen: string[] = [];
    page.on("dialog", async (d) => { seen.push(d.type()); await d.dismiss(); });
    await page.close({ runBeforeUnload: true });
    await expect.poll(() => seen).toEqual(["beforeunload"]);
    expect(page.isClosed()).toBe(false);
    await expect(page.getByLabel("Mother's name")).toHaveValue("Divya Arul");
  });

  test("[DLG-04] no prompt for portal links, for an unhandled dialog, or after submitting", async ({ page }) => {
    await page.goto(URL);
    await page.getByLabel("Child's name").fill("Kavin");
    // No listener: Playwright lets the reload through and the entry is lost without any error.
    await page.reload();
    await expect(page.getByLabel("Child's name")).toHaveValue("");

    const seen: string[] = [];
    page.on("dialog", async (d) => { seen.push(d.type()); await d.accept(); });
    // Breadcrumb links navigate inside the app: the document is not unloaded, so there is no prompt.
    await page.getByLabel("Child's name").fill("Kavin");
    await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL("/");
    expect(seen).toEqual([]);

    await page.goto(URL);
    await fillValid(page, await browserDate(page, -1));
    await page.getByLabel(/Collect from the zonal office/).check();
    await submit(page);
    await expect(page.getByRole("heading", { name: "Application submitted" })).toBeVisible();
    await page.reload();
    expect(seen).toEqual([]);
  });
});
