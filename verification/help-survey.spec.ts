import type { Frame, Page } from "@playwright/test";
import { test, expect, mockDelays } from "./fixtures";

const URL = "/help/survey";
const BASE = "http://localhost:3100";

const outerFrame = (page: Page) => page.frameLocator('iframe[title="Citizen satisfaction survey"]');
const innerFrame = (page: Page) => outerFrame(page).frameLocator('iframe[title="Survey questions"]');
const form = (page: Page) => innerFrame(page).locator("form#survey");
const submit = (page: Page) => innerFrame(page).getByRole("button", { name: "Submit feedback" });

/** The page's frames by role: the outer survey document and the inner srcdoc document. */
function frames(page: Page): { outer: Frame; inner: Frame } {
  const outer = page.frames().find((f) => f.url().endsWith("/forms/feedback"));
  const inner = page.frames().find((f) => f.url() === "about:srcdoc");
  expect(outer, "outer survey frame").toBeTruthy();
  expect(inner, "inner survey frame").toBeTruthy();
  return { outer: outer!, inner: inner! };
}

const stored = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("amc.surveyResponses") ?? "[]") as { ref: string; service: string; rating: number; comments: string; lang: string }[]);

test.describe("Satisfaction survey", () => {
  test.beforeEach(async ({ context }) => {
    await mockDelays(context, { delays: { SURVEY_INNER: 300, SURVEY_SUBMIT: 600 } });
  });

  // ───────────────────────── FRM-02 ─────────────────────────
  test("[FRM-02] the survey is two frames deep: nothing of it is in the page or in the outer frame's document", async ({ page }) => {
    await page.goto("/help?tab=contact");
    await page.getByRole("link", { name: "Rate our services" }).click();
    await expect(page).toHaveURL(/\/help\/survey$/);
    await expect(page.getByRole("heading", { level: 1, name: "Rate our services" })).toBeVisible();
    await expect(form(page)).toBeVisible();

    expect(page.frames()).toHaveLength(3);
    const { outer, inner } = frames(page);
    expect(outer.parentFrame()).toBe(page.mainFrame());
    expect(inner.parentFrame()).toBe(outer);

    // The questions frame is not a frame of the page: only of the outer document.
    await expect(page.locator('iframe[title="Survey questions"]')).toHaveCount(0);
    await expect(page.frameLocator('iframe[title="Survey questions"]').getByRole("radio")).toHaveCount(0);
    await expect(outerFrame(page).locator('iframe[title="Survey questions"]')).toHaveCount(1);
    // The controls are two levels down.
    await expect(page.getByRole("radio")).toHaveCount(0);
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await expect(outerFrame(page).getByRole("radio")).toHaveCount(0);
    await expect(innerFrame(page).getByRole("radio")).toHaveCount(5);
    await expect(innerFrame(page).getByLabel("Which service did you use most recently?")).toBeVisible();
    // The outer document is a page of its own, without the portal's header.
    await expect(outerFrame(page).getByRole("heading", { level: 1, name: "Citizen satisfaction survey" })).toBeVisible();
    await expect(outerFrame(page).getByRole("link", { name: "Login" })).toHaveCount(0);
  });

  test("[FRM-02] answers are checked inside the inner frame, then stored with a reference and thanked", async ({ page }) => {
    await page.goto(URL);
    const inner = innerFrame(page);
    await expect(form(page)).toBeVisible();
    const outerHeight = () => page.locator('iframe[title="Citizen satisfaction survey"]').evaluate((el) => el.getBoundingClientRect().height);
    const formHeight = await outerHeight();

    await submit(page).click();
    await expect(inner.getByText("Select the service you used.")).toBeVisible();
    await expect(inner.getByText("Choose how satisfied you are.")).toBeVisible();
    await expect(inner.getByLabel("Which service did you use most recently?")).toBeFocused();
    expect(await stored(page)).toEqual([]);

    await inner.getByLabel("Which service did you use most recently?").selectOption({ label: "Hall or park booking" });
    await submit(page).click();
    await expect(inner.getByText("Select the service you used.")).toBeHidden();
    await expect(inner.getByText("Choose how satisfied you are.")).toBeVisible();

    await inner.getByRole("radio", { name: "Satisfied", exact: true }).check();
    await inner.getByLabel("What could we do better? (optional)").fill("  More evening slots at the Kalaivani hall.  ");
    await submit(page).click();
    await expect(inner.getByRole("button", { name: "Sending…" })).toBeDisabled();

    await expect(inner.getByRole("heading", { name: "Thank you for your feedback" })).toBeVisible();
    const ref = (await inner.locator(".ref").textContent())!;
    expect(ref).toMatch(/^AMC\/FB\/\d{4}\/\d{6}$/);
    await expect(inner.getByText(`Your reference number is ${ref}.`)).toBeVisible();
    await expect(form(page)).toHaveCount(0);
    const saved = await stored(page);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ ref, service: "booking", rating: 4, comments: "More evening slots at the Kalaivani hall.", lang: "en" });
    // Both frames shrink to the shorter thank-you.
    await expect.poll(outerHeight).toBeLessThan(formHeight - 200);
  });

  test("[FRM-02] the frames follow the theme switch in place and speak Tamil on the Tamil page", async ({ page, context }) => {
    await page.goto(URL);
    await expect(form(page)).toBeVisible();
    const innerHtml = innerFrame(page).locator("html");
    const outerHtml = outerFrame(page).locator("html");
    await expect(innerHtml).toHaveAttribute("data-theme", "light");
    await innerHtml.evaluate((el) => { (el as HTMLElement).dataset.mark = "1"; });
    await outerHtml.evaluate((el) => { (el as HTMLElement).dataset.mark = "1"; });

    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await expect(innerHtml).toHaveAttribute("data-theme", "dark");
    await expect(outerHtml).toHaveAttribute("data-theme", "dark");
    // Neither document was reloaded.
    await expect(innerHtml).toHaveAttribute("data-mark", "1");
    await expect(outerHtml).toHaveAttribute("data-mark", "1");
    expect(await innerFrame(page).locator("body").evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(25, 33, 43)");

    await context.addCookies([{ name: "amc_lang", value: "ta", url: BASE }]);
    await page.goto(URL);
    // The frame titles are in Tamil too: find the frames by address and position instead.
    const outerTa = page.frameLocator('iframe[src="/forms/feedback"]');
    const innerTa = outerTa.frameLocator("iframe[srcdoc]");
    await expect(page.locator('iframe[title="குடிமக்கள் திருப்தி கணக்கெடுப்பு"]')).toHaveCount(1);
    await expect(outerTa.locator('iframe[title="கணக்கெடுப்புக் கேள்விகள்"]')).toHaveCount(1);
    await expect(innerTa.locator("form#survey")).toBeVisible();
    await expect(innerTa.locator("html")).toHaveAttribute("lang", "ta");
    // The dark theme was kept in the cookie: the new documents start dark.
    await expect(innerTa.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(outerTa.getByRole("heading", { level: 1, name: "குடிமக்கள் திருப்தி கணக்கெடுப்பு" })).toBeVisible();
    await innerTa.getByRole("button", { name: "கருத்தைச் சமர்ப்பிக்கவும்" }).click();
    await expect(innerTa.getByText("நீங்கள் பயன்படுத்திய சேவையைத் தேர்ந்தெடுக்கவும்.")).toBeVisible();
  });

  // ───────────────────────── FRM-03 ─────────────────────────
  test("[FRM-03] the inner frame has only srcdoc and is re-navigated to the questions after about two seconds", async ({ page, context }) => {
    await mockDelays(context, {});
    await page.goto(URL);
    const inner = innerFrame(page);
    await expect(inner.getByText("Loading the questions…")).toBeVisible();
    const started = Date.now();
    const iframe = outerFrame(page).locator('iframe[title="Survey questions"]');
    expect(await iframe.evaluate((el) => [el.hasAttribute("srcdoc"), el.hasAttribute("src"), el.id, el.getAttribute("name")])).toEqual([true, false, "", null]);
    expect(frames(page).inner.url()).toBe("about:srcdoc");
    // Mark the frame element and the loading document.
    await iframe.evaluate((el) => { (el as HTMLIFrameElement & { seen?: boolean }).seen = true; });
    await inner.locator("html").evaluate((el) => { (el as HTMLElement).dataset.mark = "1"; });
    await expect(form(page)).toHaveCount(0);

    // Waiting a second for the form is not enough.
    await expect(expect(form(page)).toBeAttached({ timeout: 1000 })).rejects.toThrow();
    await expect(form(page)).toBeVisible({ timeout: 5000 });
    expect(Date.now() - started).toBeGreaterThanOrEqual(1500);
    await expect(inner.getByText("Loading the questions…")).toHaveCount(0);

    // Same <iframe> element, new document: the mark on the loading document is gone.
    expect(await iframe.evaluate((el) => (el as HTMLIFrameElement & { seen?: boolean }).seen === true)).toBe(true);
    await expect(inner.locator("html")).not.toHaveAttribute("data-mark", "1");
    expect(await iframe.getAttribute("srcdoc")).toContain('<form id="survey"');
    expect(await iframe.getAttribute("src")).toBeNull();
    expect(frames(page).inner.url()).toBe("about:srcdoc");
    await expect(inner.getByRole("radio")).toHaveCount(5);
  });

  test("[FRM-03] sending replaces the document again; a failed send keeps the answers in the same document", async ({ page, context }) => {
    await mockDelays(context, { delays: { SURVEY_INNER: 300, SURVEY_SUBMIT: 300 }, fail: ["SURVEY_SUBMIT"] });
    await page.goto(URL);
    const inner = innerFrame(page);
    await expect(form(page)).toBeVisible();
    await inner.locator("html").evaluate((el) => { (el as HTMLElement).dataset.mark = "1"; });
    await inner.getByLabel("Which service did you use most recently?").selectOption("water");
    await inner.getByRole("radio", { name: "Very dissatisfied" }).check();
    await submit(page).click();
    await expect(inner.getByRole("alert").filter({ hasText: "Your feedback could not be sent right now. Please try again." })).toBeVisible();
    await expect(submit(page)).toBeEnabled();
    await expect(inner.locator("html")).toHaveAttribute("data-mark", "1");
    await expect(inner.getByRole("radio", { name: "Very dissatisfied" })).toBeChecked();
    expect(await stored(page)).toEqual([]);

    await mockDelays(context, { delays: { SURVEY_INNER: 300, SURVEY_SUBMIT: 300 } });
    await submit(page).click();
    await expect(inner.getByRole("heading", { name: "Thank you for your feedback" })).toBeVisible();
    await expect(inner.locator("html")).not.toHaveAttribute("data-mark", "1");
    await expect(inner.getByRole("radio")).toHaveCount(0);
    expect(await outerFrame(page).locator('iframe[title="Survey questions"]').getAttribute("srcdoc")).toContain("Thank you for your feedback");
    const saved = await stored(page);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ service: "water", rating: 1, comments: "" });
  });

  test("[FRM-03] if the questions cannot be loaded, the inner frame says so and Try again loads them", async ({ page, context }) => {
    await mockDelays(context, { delays: { SURVEY_INNER: 300 }, fail: ["SURVEY_INNER"] });
    await page.goto(URL);
    const inner = innerFrame(page);
    await expect(inner.getByRole("alert")).toContainText("The survey could not be loaded right now.");
    await expect(form(page)).toHaveCount(0);
    await mockDelays(context, { delays: { SURVEY_INNER: 1000 } });
    await inner.getByRole("button", { name: "Try again" }).click();
    await expect(inner.getByText("Loading the questions…")).toBeVisible();
    await expect(form(page)).toBeVisible();
    await expect(inner.getByRole("alert")).toHaveCount(0);
  });
});
