import { test, expect, fillLogin, solveCaptcha, USERS } from "./fixtures";

test.describe("Login", () => {
  test("[TXT-01] username is a plain labelled input", async ({ page }) => {
    await page.goto("/login");
    const u = page.getByLabel("Username");
    await expect(u).toHaveAttribute("id", "username");
    await u.fill("meena.r");
    await expect(page.locator("#username")).toHaveValue("meena.r");
  });

  test("[BTN-06] Sign in stays disabled until the form is valid", async ({ page }) => {
    await page.goto("/login");
    const btn = page.getByRole("button", { name: "Sign in", exact: true });
    await expect(btn).toBeDisabled();
    await page.getByLabel("Username").fill("meena.r");
    await page.getByLabel("Password", { exact: true }).fill("12345");
    await page.getByPlaceholder("Answer").fill("9");
    await expect(btn).toBeDisabled();
    await page.getByLabel("Password", { exact: true }).fill("123456");
    await expect(btn).toBeEnabled();
  });

  test("[OTH-14] canvas CAPTCHA: no text in DOM, wrong answer regenerates, token bypass works", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("canvas[aria-label='Arithmetic security question']")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("= ?");
    await page.getByLabel("Username").fill(USERS.meena.username);
    await page.getByLabel("Password", { exact: true }).fill(USERS.meena.password);
    const tokenBefore = await page.locator("input[name=captcha_token]").inputValue();
    await page.getByPlaceholder("Answer").fill(String((await solveCaptcha(page)) + 1));
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("security check answer is incorrect");
    await expect(page.locator("input[name=captcha_token]")).not.toHaveValue(tokenBefore);
    await page.getByPlaceholder("Answer").fill(String(await solveCaptcha(page)));
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Verify it's you" })).toBeVisible();
  });

  test("[CHK-01] SSR checked attribute never changes; property decides session storage", async ({ page, request }) => {
    const html = await (await request.get("/login")).text();
    expect(html).toMatch(/<input[^>]*id="keep-signed-in"[^>]*checked=""/);
    await page.goto("/login");
    const box = page.getByLabel("Keep me signed in on this device");
    await expect(box).toBeChecked();
    await box.uncheck();
    await expect(box).not.toBeChecked();
    expect(await box.getAttribute("checked")).toBe(""); // attribute still present
    await fillLogin(page, USERS.meena.username, USERS.meena.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    const otp = (await page.getByRole("status").filter({ hasText: "OTP:" }).textContent())!.match(/\d{6}/)![0];
    await page.getByLabel("One-time password").fill(otp);
    await page.getByRole("button", { name: "Verify & continue" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    expect(await page.evaluate(() => sessionStorage.getItem("amc.session"))).not.toBeNull();
    expect(await page.evaluate(() => localStorage.getItem("amc.session"))).toBeNull();
  });

  test("[DLG-09] OTP toast appears then removes itself after ~3s", async ({ page }) => {
    await page.goto("/login");
    await fillLogin(page, USERS.meena.username, USERS.meena.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    const toast = page.getByRole("status").filter({ hasText: "OTP:" });
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("+91 98XXX XX456");
    const shownAt = Date.now();
    await expect(toast).toHaveCount(0, { timeout: 6000 });
    expect(Date.now() - shownAt).toBeGreaterThan(2000);
  });

  test("[OTH-25] OTP is delivered to the SMS Copies inbox in a new tab", async ({ page, context }) => {
    await page.goto("/login");
    await fillLogin(page, USERS.meena.username, USERS.meena.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    const toastOtp = (await page.getByRole("status").filter({ hasText: "OTP:" }).textContent())!.match(/\d{6}/)![0];
    const [inbox] = await Promise.all([context.waitForEvent("page"), page.getByRole("main").getByRole("link", { name: "SMS Copies" }).click()]);
    await inbox.waitForLoadState();
    const first = inbox.locator("li").filter({ hasText: "is your OTP" }).first();
    await expect(first).toBeVisible();
    const smsOtp = (await first.textContent())!.match(/(\d{6}) is your OTP/)![1];
    expect(smsOtp).toBe(toastOtp);
    await inbox.close();
    await page.getByLabel("One-time password").fill(smsOtp);
    await page.getByRole("button", { name: "Verify & continue" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { level: 1, name: /^Good (morning|afternoon|evening), Meena Rajendran$/ })).toBeVisible();
  });

  test("[OTH-26] role switch: officer label, role mismatch error, officer landing page", async ({ page }) => {
    await page.goto("/login");
    const officerTab = page.getByRole("tab", { name: "Officer" });
    await officerTab.click();
    await expect(officerTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByLabel("Employee username")).toBeVisible();
    await fillLogin(page, USERS.meena.username, USERS.meena.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("This account cannot sign in as the selected role.");
    await fillLogin(page, USERS.officer.username, USERS.officer.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    const otp = (await page.getByRole("status").filter({ hasText: "OTP:" }).textContent())!.match(/\d{6}/)![0];
    await page.getByLabel("One-time password").fill(otp);
    await page.getByRole("button", { name: "Verify & continue" }).click();
    await expect(page).toHaveURL(/\/officer\/queue$/);
    await expect(page.getByRole("heading", { name: "Work Queue" })).toBeVisible();
  });
});

test.describe("Register", () => {
  test("[TXT-02] mobile number is masked as you type", async ({ page }) => {
    await page.goto("/register");
    const mobile = page.getByLabel("Mobile number");
    await mobile.fill("9841023456");
    await expect(mobile).toHaveValue("+91 98410 23456");
    await mobile.fill("abc98x41");
    await expect(mobile).toHaveValue("+91 9841");
    await mobile.fill("");
    await mobile.pressSequentially("98410234567890");
    await expect(mobile).toHaveValue("+91 98410 23456");
  });

  test("[DLG-13] 'Why do we need this?' popover opens and closes", async ({ page }) => {
    await page.goto("/register");
    const trigger = page.getByRole("button", { name: "Why do we need this?" });
    const pop = page.getByRole("dialog", { name: "Why do we need this?" });
    await expect(pop).toHaveCount(0);
    await trigger.click();
    await expect(pop).toContainText("ASP-XXXX-XXXX-X");
    await page.keyboard.press("Escape");
    await expect(pop).toHaveCount(0);
    await trigger.click();
    await expect(pop).toBeVisible();
    await page.getByLabel("Full name (as in Astheen ID)").click();
    await expect(pop).toHaveCount(0);
  });

  test("[CHK-09] terms checkbox ignores clicks until hydrated, then registration succeeds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/register");
    const terms = page.getByRole("checkbox", { name: /I agree to the Terms of Use/ });
    await expect(terms).toBeVisible();
    await terms.click(); // visible + enabled, but no listener yet
    await expect(terms).toHaveAttribute("aria-checked", "false");
    await page.waitForTimeout(Math.max(0, 4000 - (Date.now() - start)));
    await expect(terms).toHaveAttribute("aria-checked", "false"); // not replayed after hydration
    await terms.click();
    await expect(terms).toHaveAttribute("aria-checked", "true");

    const uname = `qa.${Date.now().toString(36)}`;
    await page.getByLabel("Full name (as in Astheen ID)").fill("Kavya Senthil");
    await page.getByLabel("Mobile number").fill("9876543210");
    await page.getByLabel("Astheen ID", { exact: true }).fill("482177306");
    await expect(page.getByLabel("Astheen ID", { exact: true })).toHaveValue("ASP-4821-7730-6");
    await page.getByLabel("Choose a username").fill(uname);
    await page.getByLabel("Password", { exact: true }).fill("Kavya@2026");
    await page.getByLabel("Confirm password").fill("Kavya@2026");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/login\?reason=registered/);
    await expect(page.getByText("Account created. Please sign in.")).toBeVisible();
  });
});
