import { test, expect, mockDelays, seedSession } from "./fixtures";

test.describe("Global shell", () => {
  test("[BTN-09] Services mega menu opens only on hover", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main" });
    const waterLink = nav.getByRole("link", { name: /Water Bill Payment/ });
    await expect(waterLink).toHaveCount(0);
    const trigger = nav.getByText("Services", { exact: true });
    await expect(trigger).toBeVisible();
    expect(await trigger.evaluate((el) => el.tagName)).toBe("SPAN");
    await trigger.dispatchEvent("click"); // a click without a hover does nothing
    await trigger.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    await expect(waterLink).toHaveCount(0);
    await trigger.hover();
    await expect(waterLink).toBeVisible();
    await waterLink.hover();
    await waterLink.click();
    await expect(page).toHaveURL(/\/services\/water\/pay$/);
  });

  test.describe("first visit", () => {
    test.use({ consent: false });
    test("[OTH-22] cookie banner appears after hydration on first visit only", async ({ page, request }) => {
      const ssr = await (await request.get("/")).text();
      expect(ssr).not.toContain("Cookies on this portal");
      await page.goto("/");
      const banner = page.getByRole("region", { name: "Cookies on this portal" });
      await expect(banner).toBeVisible();
      await banner.getByRole("button", { name: "Accept all" }).click();
      await expect(banner).toBeHidden();
      expect(await page.evaluate(() => localStorage.getItem("amc.consent"))).toBe('"all"');
      await page.reload();
      await page.waitForTimeout(500);
      await expect(banner).toHaveCount(0);
    });
  });

  test("[OTH-23] language switch re-renders the page in Tamil and persists", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page.getByRole("button", { name: "தமிழ்" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "ta");
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "முகப்பு" })).toBeVisible();
    await expect(page.getByRole("button", { name: "தமிழ்" })).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "ta");
    await expect(page.getByRole("heading", { name: "பிரபலமான சேவைகள்" })).toBeVisible();
  });

  test("[OTH-24] dark mode toggles html[data-theme] and survives reload", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "light");
    const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await expect(html).toHaveAttribute("data-theme", "dark");
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe(lightBg);
    await expect(page.getByRole("button", { name: "Switch to light theme" })).toBeVisible();
    await page.reload();
    await expect(html).toHaveAttribute("data-theme", "dark");
  });

  test("[OTH-11] '/' focuses search and Alt+L toggles language", async ({ page }) => {
    await page.goto("/");
    const search = page.getByRole("combobox", { name: "Search services" });
    await expect(async () => {
      await page.locator("body").click({ position: { x: 5, y: 300 } });
      await page.keyboard.press("/");
      await expect(search).toBeFocused({ timeout: 300 });
    }).toPass();
    await expect(search).toHaveValue(""); // the "/" was not typed into the box
    await page.locator("body").click({ position: { x: 5, y: 300 } });
    await page.keyboard.press("Alt+KeyL");
    await expect(page.locator("html")).toHaveAttribute("lang", "ta");
  });

  test("[DLG-05] session-timeout modal: stay signed in, then auto sign-out", async ({ page, context }) => {
    await mockDelays(context, { delays: { SESSION_WARN: 1500, SESSION_COUNTDOWN: 3000 } });
    await seedSession(context, "meena");
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { level: 1, name: /, Meena Rajendran$/ })).toBeVisible();

    const dialog = page.getByRole("dialog", { name: "Your session is about to expire" });
    await expect(dialog).toBeVisible({ timeout: 5000 });
    // Portalled to <body>, outside <main>.
    expect(await dialog.evaluate((el) => !!el.closest("main"))).toBe(false);
    await dialog.getByRole("button", { name: "Stay signed in" }).click();
    await expect(dialog).toBeHidden();
    expect(await page.evaluate(() => localStorage.getItem("amc.session"))).not.toBeNull();

    await expect(dialog).toBeVisible({ timeout: 5000 });
    await page.mouse.move(200, 200);
    await page.keyboard.press("Shift");
    await expect(dialog).toBeVisible(); // activity does not dismiss it
    await expect(page).toHaveURL(/\/login\?reason=timeout/, { timeout: 6000 });
    await expect(page.getByText("You were signed out because of inactivity.")).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("amc.session"))).toBeNull();
  });
});
