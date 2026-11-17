import type { Locator, Page } from "@playwright/test";
import { test, expect, mockDelays } from "./fixtures";

const URL = "/certificates/trade-license";
const pdf = (name: string, size = 4096) => ({ name, mimeType: "application/pdf", buffer: Buffer.alloc(size) });
const jpg = (name: string, size = 8192) => ({ name, mimeType: "image/jpeg", buffer: Buffer.alloc(size) });

const submit = (page: Page) => page.getByRole("button", { name: "Submit application" }).click();
const summary = (page: Page) => page.getByRole("alert").filter({ hasText: "Please correct the following:" });
const residence = (page: Page) => page.getByRole("group", { name: "Owner's residential address" });

/** Opaque pixels on the signature canvas. */
const ink = (canvas: Locator) =>
  canvas.evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i]) n++;
    return n;
  });

/** Draws a wavy line with the mouse (real pointer events), `steps` × 12px wide. */
async function sign(page: Page, steps = 20) {
  const canvas = page.locator("#tl-signature");
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  const y = box.y + box.height * 0.65;
  await page.mouse.move(box.x + 30, y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) await page.mouse.move(box.x + 30 + i * 12, y - Math.sin(i / 2) * 30);
  await page.mouse.up();
}

/** Where the centre of an element is, and what is actually on top at that point. */
const hitAtCentre = (loc: Locator) =>
  loc.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    const on = hit === el ? "self" : hit?.closest("header") ? "header" : hit?.closest("nav[aria-label='Sections of the application']") ? "sections" : hit?.tagName ?? "none";
    return { x, y, on };
  });

/** Everything except the bank account and the signature. */
async function fillBasics(page: Page) {
  await page.getByLabel("Name of the business").fill("Sri Murugan Sweets");
  await page.getByLabel("Business category").selectOption({ label: "Bakery and sweet stall" });
  await page.getByLabel("Floor area (sq. ft)").fill("450");
  const premises = page.getByRole("group", { name: "Address of the business premises" });
  await premises.locator("[id=addr-line]").fill("14, Thendral Street, Kalaivani Nagar");
  await premises.locator("[id=addr-pin]").fill("641014");
  await page.getByLabel("Ward", { exact: true }).selectOption("W14");
  await page.getByLabel("Rented").check();
  await page.getByLabel("Owner's name").fill("Murugan Selvam");
  await page.getByLabel("Mobile number").fill("9840012345");
  await residence(page).locator("[id=addr-line]").fill("7, Lake Road, Pavala Nagar");
  await residence(page).locator("[id=addr-pin]").fill("641022");
  await page.getByLabel("Supporting documents", { exact: true }).setInputFiles([pdf("aadhaar.pdf"), jpg("rent-agreement.jpg")]);
}

async function fillBank(page: Page) {
  await page.getByLabel("Account holder's name").fill("Murugan Selvam");
  await page.getByLabel("Bank account number", { exact: true }).fill("123456789012");
  await page.getByLabel("Re-enter bank account number").fill("123456789012");
  await page.getByLabel("IFSC code").fill("ASTB0001234");
}

async function fillAll(page: Page) {
  await fillBasics(page);
  await fillBank(page);
  await sign(page);
  await page.getByLabel(/I declare that the information given is true/).check();
}

test.describe("Trade licence", () => {
  test.beforeEach(async ({ context }) => {
    await mockDelays(context, { delays: { TRADE_SUBMIT: 0, TRADE_FEE: 300 } });
  });

  test("[DRP-02] business category is a native select with optgroups and an 'Others' in every group", async ({ page }) => {
    await page.goto(URL);
    const select = page.getByLabel("Business category");
    expect(await select.evaluate((el) => el.tagName)).toBe("SELECT");
    expect(await select.locator("optgroup").evaluateAll((gs) => gs.map((g) => (g as HTMLOptGroupElement).label)))
      .toEqual(["Food and hospitality", "Retail trade", "Services", "Manufacturing and storage"]);
    await expect(select.locator("option")).toHaveCount(20);
    await expect(select.locator("option", { hasText: /^Others$/ })).toHaveCount(4);

    // By label, "Others" picks the first match: the food group's.
    await select.selectOption({ label: "Others" });
    await expect(select).toHaveValue("FH99");
    expect(await select.evaluate((el: HTMLSelectElement) => (el.selectedOptions[0].parentElement as HTMLOptGroupElement).label)).toBe("Food and hospitality");

    // The retail "Others" needs its value or a locator scoped to the optgroup.
    const retailOthers = await select.locator("optgroup[label='Retail trade'] option", { hasText: /^Others$/ }).getAttribute("value");
    await select.selectOption(retailOthers!);
    await expect(select).toHaveValue("RT99");
    await select.selectOption({ label: "Pharmacy" });
    await expect(select).toHaveValue("RT04");

    // A group label is not an option: selecting it by label never succeeds.
    await expect(select.selectOption({ label: "Retail trade" }, { timeout: 1000 })).rejects.toThrow();
    await expect(select).toHaveValue("RT04");
  });

  test("[SHD-03] the fee badge renders inside a closed shadow root", async ({ page, context }) => {
    await page.goto(URL);
    const host = page.locator("amc-fee-badge");
    await page.getByLabel("Business category").selectOption({ label: "Bakery and sweet stall" });
    await page.getByLabel("Floor area (sq. ft)").fill("450");

    // The page's own view of the host: no shadowRoot, no light-DOM text, no attributes besides id.
    expect(await host.evaluate((el) => ({ root: el.shadowRoot, text: el.textContent, inner: (el as HTMLElement).innerText, attrs: el.getAttributeNames() })))
      .toEqual({ root: null, text: "", inner: "", attrs: ["id"] });

    // DevTools protocol pierces closed roots: wait there for the quote (TRADE_FEE) to arrive.
    const cdp = await context.newCDPSession(page);
    type Node = { nodeId: number; localName?: string; children?: Node[]; shadowRoots?: (Node & { shadowRootType?: string })[] };
    const badgeRoot = async () => {
      const { root } = (await cdp.send("DOM.getDocument", { depth: -1, pierce: true })) as { root: Node };
      const find = (n: Node): Node | undefined => {
        if (n.localName === "amc-fee-badge") return n;
        for (const c of [...(n.children ?? []), ...(n.shadowRoots ?? [])]) { const r = find(c); if (r) return r; }
      };
      const sr = find(root)!.shadowRoots![0];
      const { outerHTML } = (await cdp.send("DOM.getOuterHTML", { nodeId: sr.nodeId })) as { outerHTML: string };
      return { type: sr.shadowRootType, html: outerHTML };
    };
    await expect.poll(async () => (await badgeRoot()).html).toContain("₹1,800.00");
    expect((await badgeRoot()).type).toBe("closed");

    // Playwright's text, role and aria-snapshot engines do not see into it.
    await expect(page.getByText("₹1,800.00")).toHaveCount(0);
    await expect(page.getByText("Annual licence fee")).toHaveCount(0);
    await expect(host.getByRole("status")).toHaveCount(0);
    expect(await page.locator("#tl-sec-6").ariaSnapshot()).not.toContain("1,800");
    // The browser's accessibility tree does include it.
    const ax = (await cdp.send("Accessibility.getFullAXTree")) as { nodes: { name?: { value?: string } }[] };
    expect(ax.nodes.some((n) => n.name?.value === "₹1,800.00")).toBe(true);

    // After submitting, the fee is shown in ordinary DOM on the acknowledgement.
    await fillAll(page);
    await submit(page);
    await expect(page.getByRole("heading", { name: "Application submitted" })).toBeVisible();
    await expect(page.getByText("₹1,800.00", { exact: true })).toBeVisible();
  });

  test("[SHD-03] forcing shadow roots open before the page loads makes the badge readable", async ({ page, context }) => {
    await mockDelays(context, { delays: { TRADE_FEE: 1000 } });
    await page.addInitScript(() => {
      const attach = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function (init: ShadowRootInit) { return attach.call(this, { ...init, mode: "open" }); };
    });
    await page.goto(URL);
    const badge = page.locator("amc-fee-badge");
    await expect(badge.getByText("Select the business category and enter the floor area to see the fee.")).toBeVisible();
    await page.getByLabel("Business category").selectOption("RT01");
    await page.getByLabel("Floor area (sq. ft)").fill("150");
    await expect(badge.getByText("Calculating…")).toBeVisible();
    await expect(badge.getByRole("status")).toContainText("₹1,200.00 per year");
    await page.getByLabel("Floor area (sq. ft)").fill("550");
    await expect(badge.getByRole("status")).toContainText("₹1,600.00 per year");
  });

  test("[TXT-09] the re-entered account number cannot be pasted, only typed", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://localhost:3100" });
    await page.goto(URL);
    const account = page.getByLabel("Bank account number", { exact: true });
    const again = page.getByLabel("Re-enter bank account number");
    await account.fill("123456789012");
    await account.focus();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.press("ControlOrMeta+C");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("123456789012");

    // Keyboard paste works in other fields but leaves the confirmation field empty, with no message.
    await again.focus();
    await page.keyboard.press("ControlOrMeta+V");
    await expect(again).toHaveValue("");
    await page.getByLabel("Account holder's name").focus();
    await page.keyboard.press("ControlOrMeta+V");
    await expect(page.getByLabel("Account holder's name")).toHaveValue("123456789012");

    // The page cancels the paste event itself.
    expect(await again.evaluate((el) => !el.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: new DataTransfer() })))).toBe(true);

    // fill() and typing do not paste, so they work.
    await again.fill("123456789012");
    await expect(again).toHaveValue("123456789012");
    await again.fill("");
    await again.pressSequentially("123456789000");
    await expect(again).toHaveValue("123456789000");
    await submit(page);
    await expect(summary(page)).toContainText("The bank account numbers do not match.");
  });

  test("[DYN-09] the sticky header and section bar cover fields scrolled beneath them", async ({ page }) => {
    await page.goto(URL);
    expect(await page.locator("header").first().evaluate((el) => getComputedStyle(el).position)).toBe("sticky");
    const bar = page.getByRole("navigation", { name: "Sections of the application" });
    expect(await bar.evaluate((el) => getComputedStyle(el).position)).toBe("sticky");

    // scrollIntoView() aligns to the top of the viewport, which is under the header.
    const rented = page.getByLabel("Rented");
    await rented.evaluate((el) => el.scrollIntoView());
    const hit = await hitAtCentre(rented);
    expect(hit.on).toBe("header");
    // A click at those coordinates (what a coordinate-based tool does) lands on the header.
    await page.mouse.click(hit.x, hit.y);
    await expect(rented).not.toBeChecked();
    await expect(page).toHaveURL(URL);
    // force skips Playwright's hit-target check, so it also clicks the header.
    await rented.click({ force: true });
    await expect(rented).not.toBeChecked();

    // Just below the header, the section bar covers it instead.
    await rented.evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().top - 145));
    expect((await hitAtCentre(rented)).on).toBe("sections");

    // A normal action notices the element is covered and scrolls again before clicking.
    await rented.check();
    await expect(rented).toBeChecked();
    expect((await hitAtCentre(rented)).on).toBe("self");

    // The bar's own links land each section's heading below the bar.
    await bar.getByRole("link", { name: /Bank account/ }).click();
    await expect(page).toHaveURL(`${URL}#tl-sec-5`);
    const heading = page.getByRole("heading", { name: "5. Bank account for refunds" });
    await expect.poll(async () => (await hitAtCentre(heading)).on).toBe("self");
  });

  test("[FIL-04] supporting documents use one multiple-file input whose selection is replaced, not added to", async ({ page }) => {
    await page.goto(URL);
    const input = page.getByLabel("Supporting documents", { exact: true });
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute("multiple", "");
    await expect(input).toHaveAttribute("accept", ".pdf,.jpg,.jpeg,.png");
    const count = () => input.evaluate((el: HTMLInputElement) => el.files!.length);
    const list = page.getByRole("list", { name: /Attached files/ });

    await input.setInputFiles([pdf("aadhaar.pdf"), jpg("tax-receipt.jpg")]);
    expect(await count()).toBe(2);
    await expect(page.getByText("Attached files (2)")).toBeVisible();
    await expect(list.getByRole("listitem")).toHaveText(["aadhaar.pdf (4 KB)", "tax-receipt.jpg (8 KB)"]);

    // Choosing again replaces the selection.
    await input.setInputFiles(pdf("lease-deed.pdf"));
    expect(await count()).toBe(1);
    await expect(list.getByRole("listitem")).toHaveText(["lease-deed.pdf (4 KB)"]);

    // One unusable file refuses the whole selection.
    await input.setInputFiles([pdf("aadhaar.pdf"), { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("x") }]);
    await expect(page.getByRole("alert").filter({ hasText: "notes.txt" })).toHaveText("notes.txt: only PDF, JPG or PNG files can be attached.");
    expect(await count()).toBe(0);
    await expect(list).toHaveCount(0);

    await input.setInputFiles(["a", "b", "c", "d", "e", "f"].map((n) => pdf(`${n}.pdf`)));
    await expect(page.getByRole("alert").filter({ hasText: "at most" })).toHaveText("You can attach at most 5 files.");
    expect(await count()).toBe(0);

    await input.setInputFiles(pdf("aadhaar.pdf"));
    await submit(page);
    await expect(summary(page)).toContainText("Attach at least 2 supporting documents.");

    await input.setInputFiles([pdf("aadhaar.pdf"), jpg("big.jpg", 3 * 1024 * 1024)]);
    await expect(page.getByRole("alert").filter({ hasText: "big.jpg" })).toHaveText("big.jpg: the file is larger than 2 MB.");
    await input.setInputFiles([pdf("aadhaar.pdf"), pdf("lease-deed.pdf")]);
    await page.getByRole("button", { name: "Remove all files" }).click();
    expect(await count()).toBe(0);
    await expect(list).toHaveCount(0);
  });

  test("[OTH-05] the signature is drawn on a canvas with pointer events", async ({ page }) => {
    await page.goto(URL);
    const canvas = page.getByRole("img", { name: "Signature of the owner" });
    expect(await canvas.evaluate((el) => el.tagName)).toBe("CANVAS");
    await expect(page.locator("input[name*=sign i], textarea[name*=sign i]")).toHaveCount(0);
    const clear = page.getByRole("button", { name: "Clear signature" });
    await expect(clear).toBeDisabled();

    // Mouse events dispatched from script draw nothing: the pad listens to pointer events.
    await canvas.evaluate((c) => {
      const r = c.getBoundingClientRect();
      const fire = (type: string, x: number, y: number) => c.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, buttons: 1 }));
      fire("mousedown", 20, 50);
      for (let i = 1; i < 20; i++) fire("mousemove", 20 + i * 10, 50 + (i % 2) * 20);
      fire("mouseup", 220, 50);
    });
    expect(await ink(canvas)).toBe(0);
    await expect(clear).toBeDisabled();

    // A tiny mark is not accepted as a signature.
    await sign(page, 2);
    expect(await ink(canvas)).toBeGreaterThan(0);
    await submit(page);
    await expect(summary(page)).toContainText("The signature is too short. Clear it and sign again.");

    await clear.click();
    expect(await ink(canvas)).toBe(0);
    await expect(clear).toBeDisabled();
    await submit(page);
    await expect(summary(page)).toContainText("Sign in the signature box.");

    // A real mouse drag (pointerdown / pointermove / pointerup) signs.
    await sign(page);
    expect(await ink(canvas)).toBeGreaterThan(200);
    await expect(clear).toBeEnabled();
    await submit(page);
    await expect(summary(page)).not.toContainText("signature");
  });

  test("[OTH-13] the two address blocks repeat the same ids", async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator("[id=addr-line]")).toHaveCount(2);
    await expect(page.locator("[id=addr-pin]")).toHaveCount(2);
    await expect(page.locator("[id=addr-pin-help]")).toHaveCount(2);
    // getElementById and the labels' `for` both resolve to the first (premises) element.
    expect(await page.evaluate(() => document.getElementById("addr-pin") === document.querySelectorAll("[id=addr-pin]")[0])).toBe(true);
    expect(await page.evaluate(() => [...document.querySelectorAll<HTMLInputElement>("[id=addr-pin]")].map((el) => el.labels!.length))).toEqual([2, 0]);
    // So a label locator finds only the premises PIN, and the residence PIN has no accessible name.
    await expect(page.getByLabel("PIN code")).toHaveCount(1);
    await expect(residence(page).getByRole("textbox", { name: "PIN code" })).toHaveCount(0);
    await expect(residence(page).getByRole("textbox")).toHaveCount(2);

    // Clicking the residence block's label focuses the premises field.
    await residence(page).getByText("PIN code").click();
    expect(await page.evaluate(() => document.activeElement === document.querySelectorAll("[id=addr-pin]")[0])).toBe(true);
    await page.getByLabel("PIN code").fill("641014");
    await expect(page.locator("[id=addr-pin]").nth(0)).toHaveValue("641014");
    await expect(page.locator("[id=addr-pin]").nth(1)).toHaveValue("");

    // Scope by the fieldset (or use nth) to reach the second one.
    await residence(page).locator("[id=addr-pin]").fill("641022");
    await expect(page.locator("[id=addr-pin]").nth(1)).toHaveValue("641022");
    await submit(page);
    await expect(summary(page)).toContainText("Enter the owner's full residential address.");
    await expect(summary(page)).not.toContainText("PIN code for the residential address");
  });

  test("[OTH-13] a complete application is saved with both addresses and acknowledged", async ({ page }) => {
    await page.goto(URL);
    await fillAll(page);
    await submit(page);
    await expect(page.getByRole("heading", { name: "Application submitted" })).toBeVisible();
    const ref = (await page.locator("#tl-ref").textContent())!;
    expect(ref).toMatch(/^AMC\/TL\/\d{4}\/\d{6}$/);
    await expect(page.getByText("XXXXXXXX9012")).toBeVisible();
    const apps = JSON.parse((await page.evaluate(() => localStorage.getItem("amc.applications")))!);
    expect(apps[0]).toMatchObject({
      ref, service: "trade", amount: 1800,
      details: {
        category: "FH02", area: "450", ward: "W14", ownership: "rented",
        premises: "14, Thendral Street, Kalaivani Nagar 641014", residence: "7, Lake Road, Pavala Nagar 641022",
        documents: "aadhaar.pdf, rent-agreement.jpg", account: "XXXXXXXX9012", ifsc: "ASTB0001234",
      },
    });
    expect(apps[0].details.signature).toMatch(/^data:image\/png;base64,/);
  });

  test("[DLG-04] the trade licence form asks before leaving with unsaved changes", async ({ page }) => {
    await page.goto(URL);
    const seen: string[] = [];
    page.on("dialog", async (d) => { seen.push(d.type()); await d.accept(); });
    const wouldAsk = () => page.evaluate(() => { const e = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; });

    expect(await wouldAsk()).toBe(false);
    await page.getByLabel("Name of the business").fill("Sri Murugan Sweets");
    expect(await wouldAsk()).toBe(true);
    await page.reload();
    await expect.poll(() => seen).toEqual(["beforeunload"]);
    await expect(page.getByLabel("Name of the business")).toHaveValue("");

    // A file choice alone also counts as a change.
    await page.getByLabel("Supporting documents", { exact: true }).setInputFiles(pdf("aadhaar.pdf"));
    expect(await wouldAsk()).toBe(true);

    // The section bar's links stay on the page: no prompt.
    await page.getByRole("navigation", { name: "Sections of the application" }).getByRole("link", { name: /Documents/ }).click();
    expect(seen).toEqual(["beforeunload"]);

    await page.reload();
    await expect.poll(() => seen).toEqual(["beforeunload", "beforeunload"]);
    await fillAll(page);
    await submit(page);
    await expect(page.getByRole("heading", { name: "Application submitted" })).toBeVisible();
    expect(await wouldAsk()).toBe(false);
    await page.reload();
    expect(seen).toEqual(["beforeunload", "beforeunload"]);
  });
});
