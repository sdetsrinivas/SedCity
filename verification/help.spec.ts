import type { Locator, Page } from "@playwright/test";
import { test, expect, mockDelays } from "./fixtures";
import bookings from "../src/mock/data/bookings.json";

const URL = "/help";
const BASE = "http://localhost:3100";

const chat = (page: Page) => page.locator("amc-help-chat");
const log = (page: Page) => chat(page).getByRole("log");
const messages = (page: Page) => log(page).getByRole("listitem");
const question = (page: Page) => chat(page).getByRole("textbox", { name: "Your question" });
const send = (page: Page) => chat(page).getByRole("button", { name: "Send", exact: true });
const chip = (page: Page, name: string) => chat(page).getByRole("button", { name, exact: true });
const typing = (page: Page) => chat(page).getByText("Uthavi is typing…");

/** The open page with the chat element defined and showing its welcome message. */
async function open(page: Page, path = URL) {
  await page.goto(path);
  await expect(messages(page)).toHaveCount(1);
  await expect(messages(page).first()).toContainText("I am Uthavi");
}

/** Shadow roots between an element and the document, innermost host first. */
const hostChain = (l: Locator) =>
  l.evaluate((el) => {
    const hosts: string[] = [];
    let node: Node = el;
    for (let root = node.getRootNode(); root instanceof ShadowRoot; root = node.getRootNode()) {
      hosts.push(root.host.localName);
      node = root.host;
    }
    return hosts;
  });

test.describe("Help centre", () => {
  test.beforeEach(async ({ context }) => {
    await mockDelays(context, { delays: { CHAT_REPLY: 600, CHAT_TRANSCRIPT: 600 } });
  });

  test("[OTH-07] tabs: one panel shown, the others hidden but present; click, arrow keys, Home/End and ?tab= select", async ({ page }) => {
    await page.goto(URL);
    const tabs = page.getByRole("tablist", { name: "Help topics" });
    const faq = tabs.getByRole("tab", { name: "Frequently asked questions" });
    const fees = tabs.getByRole("tab", { name: "Fees and charges" });
    const contact = tabs.getByRole("tab", { name: "Contact us" });
    await expect(tabs.getByRole("tab")).toHaveCount(3);
    await expect(faq).toHaveAttribute("aria-selected", "true");
    await expect(fees).toHaveAttribute("aria-selected", "false");
    await expect(page.getByRole("tabpanel")).toHaveCount(1); // hidden panels leave the accessibility tree…
    await expect(page.locator("[role=tabpanel]")).toHaveCount(3); // …but stay in the DOM
    // The fee table is already in the markup, just not visible.
    await expect(page.locator("#fee-schedule")).toHaveCount(1);
    await expect(page.locator("#fee-schedule")).toBeHidden();
    await expect(page.locator("#help-panel-contact").getByText("care@amc.example")).toBeHidden();

    await fees.click();
    await expect(fees).toHaveAttribute("aria-selected", "true");
    await expect(faq).toHaveAttribute("aria-selected", "false");
    await expect(page.getByRole("tabpanel", { name: "Fees and charges" })).toBeVisible();
    await expect(page.locator("#fee-schedule")).toBeVisible();
    await expect(page).toHaveURL(/\/help\?tab=fees$/);
    // Roving tabindex: only the selected tab is in the Tab order.
    expect(await tabs.getByRole("tab").evaluateAll((els) => els.map((e) => e.getAttribute("tabindex")))).toEqual(["-1", "0", "-1"]);

    // Arrow keys move the selection at once (automatic activation) and wrap.
    await fees.focus();
    await page.keyboard.press("ArrowRight");
    await expect(contact).toBeFocused();
    await expect(contact).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#help-panel-contact").getByRole("link", { name: "care@amc.example" })).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(faq).toHaveAttribute("aria-selected", "true");
    await expect(page).toHaveURL(/\/help$/);
    await page.keyboard.press("End");
    await expect(contact).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Home");
    await expect(faq).toBeFocused();

    // The address opens a tab directly (server-rendered, visible before any script runs).
    await page.goto(`${URL}?tab=fees`);
    await expect(fees).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#fee-schedule")).toBeVisible();
  });

  test("[OTH-08] FAQ accordion: answers are hidden until opened, and only one is open at a time", async ({ page }) => {
    await page.goto(URL);
    const panel = page.getByRole("tabpanel", { name: "Frequently asked questions" });
    const buttons = panel.getByRole("button");
    await expect(buttons).toHaveCount(9);
    for (const b of await buttons.all()) await expect(b).toHaveAttribute("aria-expanded", "false");
    const q1 = panel.getByRole("button", { name: "Can I pay only part of my water bill?" });
    const q2 = panel.getByRole("button", { name: "How long does it take to get a birth certificate?" });
    const a1 = page.locator(`#${await q1.getAttribute("aria-controls")}`);
    const a2 = page.locator(`#${await q2.getAttribute("aria-controls")}`);
    // The answer text is in the DOM while closed, but not visible.
    await expect(a1).toContainText("amount slider");
    await expect(a1).toBeHidden();
    await expect(panel.getByRole("region")).toHaveCount(0);

    await q1.click();
    await expect(q1).toHaveAttribute("aria-expanded", "true");
    await expect(a1).toBeVisible();
    await expect(panel.getByRole("region", { name: "Can I pay only part of my water bill?" })).toContainText("carried forward to your next bill");

    // Opening another question closes the first one.
    await q2.click();
    await expect(q2).toHaveAttribute("aria-expanded", "true");
    await expect(a2).toContainText("ready 7 days after");
    await expect(a2).toBeVisible();
    await expect(q1).toHaveAttribute("aria-expanded", "false");
    await expect(a1).toBeHidden();
    await expect(panel.getByRole("region")).toHaveCount(1);

    // Keyboard: Enter on a focused question toggles it; a second press closes it.
    await q2.focus();
    await page.keyboard.press("Enter");
    await expect(q2).toHaveAttribute("aria-expanded", "false");
    await expect(panel.getByRole("region")).toHaveCount(0);
  });

  test("[TBL-01] static fee schedule: caption, header cells and grouped rows; read cells by row header and column", async ({ page }) => {
    await page.goto(`${URL}?tab=fees`);
    const table = page.getByRole("table", { name: /^Schedule of fees and charges \(in force from 01\/04\/2026\)$/ });
    await expect(table).toBeVisible();
    expect(await table.getByRole("columnheader").allInnerTexts()).toEqual(["SERVICE", "FEE", "CHARGED", "NOTES"]); // text-transform: uppercase
    expect(await table.getByRole("columnheader").allTextContents()).toEqual(["Service", "Fee", "Charged", "Notes"]);
    // 1 header row + 3 group rows + 13 services.
    await expect(table.getByRole("row")).toHaveCount(17);
    await expect(table.locator("tbody")).toHaveCount(3);
    // Positions include the group rows: the 2nd row is a group, not the first service.
    await expect(table.getByRole("row").nth(1)).toHaveText("Certificates and licences");
    await expect(table.getByRole("row").nth(1).getByRole("cell")).toHaveCount(0);

    const feeCol = (await table.getByRole("columnheader").allTextContents()).indexOf("Fee");
    const cellsOf = (service: string) => table.getByRole("row").filter({ has: page.getByRole("rowheader", { name: service, exact: true }) }).getByRole("cell");
    await expect(cellsOf("Birth certificate").nth(feeCol - 1)).toHaveText("₹50.00");
    await expect(cellsOf("Birth certificate").nth(1)).toHaveText("per copy");
    await expect(cellsOf("Delivery by Speed Post").first()).toHaveText("₹40.00");
    await expect(cellsOf("Trade licence").first()).toHaveText("₹500.00 – ₹3,000.00");
    await expect(cellsOf("Water bill payment").first()).toHaveText("Free");

    // One row per bookable venue, at its hourly rate (same data as /bookings).
    const venues = table.locator("tbody").nth(1);
    // The group's own header cell (scope=rowgroup) is a row header too.
    await expect(venues.getByRole("rowheader")).toHaveText(["Community halls and parks (hire charges)", ...bookings.venues.map((v) => v.en)]);
    for (const v of bookings.venues) {
      const rate = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(v.rate);
      await expect(cellsOf(v.en).first()).toHaveText(rate);
    }

    // Tamil: same table, Tamil headers and venue names.
    await page.context().addCookies([{ name: "amc_lang", value: "ta", url: BASE }]);
    await page.reload();
    const ta = page.getByRole("table", { name: /^கட்டண அட்டவணை/ });
    await expect(ta.getByRole("rowheader", { name: "கலைவாணி நகர் சமுதாயக் கூடம்" })).toBeVisible();
    await expect(ta.getByRole("row")).toHaveCount(17);
  });

  test("[SHD-01] the chat lives in an open shadow root: invisible to document queries and XPath, found by piercing locators", async ({ page }) => {
    await open(page);
    const host = chat(page);
    expect(await host.evaluate((el) => ({ mode: el.shadowRoot?.mode, light: el.childNodes.length, text: el.textContent }))).toEqual({ mode: "open", light: 0, text: "" });
    // Ids inside the root are not document ids.
    expect(await page.evaluate(() => [document.getElementById("chat-input"), document.querySelector("#chat-transcript"), document.querySelector("amc-help-chat input")])).toEqual([null, null, null]);
    await expect(page.locator("xpath=//input[@id='chat-input']")).toHaveCount(0);
    await expect(page.locator("xpath=//*[contains(text(),'I am Uthavi')]")).toHaveCount(0);
    // CSS, role and text locators pierce open roots.
    await expect(page.locator("#chat-input")).toHaveCount(1);
    await expect(host.getByRole("heading", { name: "Uthavi – AMC assistant" })).toBeVisible();
    await expect(page.getByText("I am Uthavi", { exact: false })).toBeVisible();
    expect(await host.evaluate((el) => el.shadowRoot!.querySelector("#chat-input")!.getAttribute("name"))).toBe("question");
  });

  test("[SHD-01] the chat follows the portal's dark theme and language (inherited custom properties, Tamil strings)", async ({ page, context }) => {
    await context.addCookies([{ name: "amc_theme", value: "dark", url: BASE }, { name: "amc_lang", value: "ta", url: BASE }]);
    await page.goto(URL);
    const host = chat(page);
    await expect(host.getByRole("heading", { name: "உதவி – மாநகராட்சி உதவியாளர்" })).toBeVisible();
    await expect(host.getByRole("textbox", { name: "உங்கள் கேள்வி" })).toBeVisible();
    const colours = await host.evaluate((el) => {
      const head = el.shadowRoot!.querySelector(".head")!;
      return { head: getComputedStyle(head).backgroundColor, primary: getComputedStyle(document.documentElement).getPropertyValue("--c-primary").trim() };
    });
    expect(colours).toEqual({ head: "rgb(95, 176, 217)", primary: "#5fb0d9" });

    await host.getByRole("textbox", { name: "உங்கள் கேள்வி" }).fill("சொத்து வரி எவ்வளவு?");
    await page.keyboard.press("Enter");
    await expect(host.getByRole("log").getByRole("listitem").last()).toContainText("மதிப்பீட்டு எண்ணைத்", { timeout: 4000 });
  });

  test("[TXT-07] the question box is in the shadow root; Send follows input events; replies arrive after CHAT_REPLY", async ({ page, context }) => {
    await mockDelays(context, { delays: { CHAT_REPLY: 1500 } });
    await open(page);
    const input = question(page);
    await expect(input).toBeEditable();
    await expect(input).toHaveAttribute("placeholder", "Type your question");
    await expect(send(page)).toBeDisabled();

    // A value set from script (no input event) leaves Send disabled, and Enter does nothing.
    await input.evaluate((el: HTMLInputElement) => { el.value = "water bill"; });
    await expect(send(page)).toBeDisabled();
    await input.press("Enter");
    await expect(messages(page)).toHaveCount(1);

    await input.fill("How do I pay my water bill?");
    await expect(send(page)).toBeEnabled();
    await input.press("Enter");
    await expect(messages(page)).toHaveCount(2);
    await expect(messages(page).nth(1)).toHaveText("You: How do I pay my water bill?");
    await expect(input).toHaveValue("");
    await expect(input).toBeFocused();
    await expect(typing(page)).toBeVisible();
    // While the assistant is typing, Send stays disabled even with text in the box.
    await input.fill("and property tax?");
    await expect(send(page)).toBeDisabled();

    const reply = messages(page).nth(2);
    await expect(reply).toContainText("consumer number printed at the top of your bill", { timeout: 4000 });
    await expect(typing(page)).toBeHidden();
    await expect(reply.getByRole("link", { name: "Pay water bill" })).toHaveAttribute("href", "/services/water/pay");
    // The text typed meanwhile is kept and can be sent now.
    await expect(input).toHaveValue("and property tax?");
    await send(page).click();
    await expect(messages(page).nth(4)).toContainText("assessment number", { timeout: 4000 });

    // Typed text that matches no topic gets the fallback answer.
    await input.pressSequentially("qwerty");
    await input.press("Enter");
    await expect(messages(page).nth(6)).toContainText("Sorry, I did not understand that", { timeout: 4000 });
  });

  test("[SHD-02] quick replies are buttons three shadow roots deep; clicking one asks that question", async ({ page }) => {
    await open(page);
    const book = chip(page, "Book a hall or park");
    expect(await hostChain(book)).toEqual(["amc-reply-chip", "amc-quick-replies", "amc-help-chat"]);
    // One level of shadowRoot is not enough: the chat's own root has no chip buttons.
    expect(await chat(page).evaluate((el) => ({
      inChatRoot: el.shadowRoot!.querySelectorAll("amc-reply-chip button").length,
      inListRoot: el.shadowRoot!.querySelector("amc-quick-replies")!.shadowRoot!.querySelectorAll("button").length,
      chips: el.shadowRoot!.querySelector("amc-quick-replies")!.shadowRoot!.querySelectorAll("amc-reply-chip").length,
    }))).toEqual({ inChatRoot: 0, inListRoot: 0, chips: 6 });
    await expect(page.locator("xpath=//button[contains(.,'Book a hall or park')]")).toHaveCount(0);

    await book.click();
    await expect(messages(page).nth(1)).toHaveText("You: Book a hall or park");
    // The chips are disabled while the reply is on its way.
    await expect(chip(page, "Report a problem")).toBeDisabled();
    await expect(messages(page).nth(2)).toContainText("two-hour slots", { timeout: 4000 });
    await expect(messages(page).nth(2).getByRole("link", { name: "Book a hall or park" })).toHaveAttribute("href", "/bookings");
    // New chips follow the answer.
    await expect(chat(page).locator("amc-reply-chip")).toHaveCount(3);
    await expect(chip(page, "Fees and charges")).toBeEnabled();
    await expect(chip(page, "Pay my water bill")).toHaveCount(0);
    await chip(page, "Fees and charges").click();
    await expect(messages(page).nth(4)).toContainText("listed on this page", { timeout: 4000 });
    await expect(messages(page).nth(4).getByRole("link", { name: "See fees and charges" })).toHaveAttribute("href", "/help?tab=fees");
  });

  test("[CHK-05] the transcript checkbox is a native box inside the shadow root; ticked, End chat emails the conversation", async ({ page }) => {
    await open(page);
    const box = chat(page).getByRole("checkbox", { name: "Email me a copy of this chat" });
    const email = chat(page).getByRole("textbox", { name: "Email address" });
    const end = chat(page).getByRole("button", { name: "End chat" });
    const alert = chat(page).getByRole("alert");
    await expect(box).not.toBeChecked();
    await expect(email).toBeHidden();
    expect(await page.evaluate(() => [...document.querySelectorAll("input[type=checkbox]")].some((b) => b.id === "chat-transcript"))).toBe(false);
    await expect(page.locator("xpath=//input[@type='checkbox' and @id='chat-transcript']")).toHaveCount(0);
    expect(await box.evaluate((el: HTMLInputElement) => [el.type, el.getRootNode() instanceof ShadowRoot])).toEqual(["checkbox", true]);

    await question(page).fill("When is the ward office open?");
    await question(page).press("Enter");
    await expect(messages(page).nth(2)).toContainText("Saturday 10:00–13:00", { timeout: 4000 });

    await box.check();
    await expect(box).toBeChecked();
    await expect(email).toBeVisible();
    await end.click();
    await expect(alert).toHaveText("Enter the email address for the copy, or untick the box.");
    await email.fill("meena.r@example");
    await end.click();
    await expect(alert).toHaveText("Enter a valid email address, for example name@example.com.");
    await email.fill("meena.r@example.com");
    await end.click();
    await expect(chat(page).getByRole("button", { name: "Sending the copy…" })).toBeDisabled();
    await expect(messages(page).last()).toHaveText("Chat ended. A copy of this conversation has been sent to meena.r@example.com.", { timeout: 4000 });
    await expect(question(page)).toBeHidden();
    await expect(box).toBeHidden();

    // A new chat starts with the box unticked and an empty address.
    await chat(page).getByRole("button", { name: "Start a new chat" }).click();
    await expect(messages(page)).toHaveCount(1);
    await expect(box).not.toBeChecked();
    await expect(email).toBeHidden();
    await expect(chat(page).locator("#chat-email")).toHaveValue("");

    // Unticked, End chat closes without a copy.
    await end.click();
    await expect(messages(page).last()).toHaveText("Chat ended. Thank you for contacting the Corporation.");
  });

  test("[CHK-05] a failed transcript keeps the chat open with an error", async ({ page, context }) => {
    await mockDelays(context, { delays: { CHAT_REPLY: 300, CHAT_TRANSCRIPT: 300 }, fail: ["CHAT_TRANSCRIPT"] });
    await open(page);
    await chat(page).getByLabel("Email me a copy of this chat").check();
    await chat(page).getByLabel("Email address").fill("arul.k@example.com");
    await chat(page).getByRole("button", { name: "End chat" }).click();
    await expect(chat(page).getByRole("alert")).toHaveText("The copy could not be sent right now. Please try again.");
    await expect(question(page)).toBeVisible();
    await expect(chat(page).getByLabel("Email me a copy of this chat")).toBeChecked();
  });
});
