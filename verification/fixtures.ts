import { test as base, expect, type BrowserContext, type Page } from "@playwright/test";
import users from "../src/mock/data/users.json";

type MockOverrides = { scale?: number; delays?: Record<string, number>; fail?: string[] };

export const USERS = {
  meena: users.find((u) => u.username === "meena.r")!,
  arul: users.find((u) => u.username === "arul.k")!,
  officer: users.find((u) => u.username === "officer.selvi")!,
};

/** Set the test-only `amc_mock` cookie (delay/failure overrides). */
export async function mockDelays(context: BrowserContext, overrides: MockOverrides, baseURL = "http://localhost:3100") {
  await context.addCookies([{ name: "amc_mock", value: encodeURIComponent(JSON.stringify(overrides)), url: baseURL }]);
}

/** Put a signed-in session straight into storage (skips the UI login). */
export async function seedSession(context: BrowserContext, who: keyof typeof USERS = "meena") {
  const u = USERS[who];
  const session = {
    username: u.username, name: u.name, nameTa: u.nameTa, role: u.role, astheenId: u.astheenId,
    mobile: u.mobile, email: u.email, ward: u.ward, loginAt: new Date().toISOString(), keepSignedIn: true,
  };
  await context.addInitScript((s) => {
    if (!sessionStorage.getItem("amc.__seeded")) {
      localStorage.setItem("amc.session", JSON.stringify(s));
      sessionStorage.setItem("amc.__seeded", "1");
    }
  }, session);
}

/** OTH-14 bypass: decode the hidden captcha token and compute the answer. */
export async function solveCaptcha(page: Page): Promise<number> {
  const token = await page.locator("input[name=captcha_token]").inputValue();
  const c = JSON.parse(Buffer.from(token, "base64").toString()) as { a: number; b: number; op: string };
  return c.op === "+" ? c.a + c.b : c.op === "-" ? c.a - c.b : c.a * c.b;
}

/** Fill the credentials step of /login (does not submit). */
export async function fillLogin(page: Page, username: string, password: string) {
  await page.getByLabel(/username/i).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await expect(page.locator("input[name=captcha_token]")).not.toHaveValue("");
  await page.getByPlaceholder("Answer").fill(String(await solveCaptcha(page)));
}

/**
 * Default fixture: cookie consent pre-accepted so the banner (OTH-22) doesn't cover the page.
 * Tests that need a first-visit experience use `test.use({ consent: false })`.
 */
export const test = base.extend<{ consent: boolean }>({
  consent: [true, { option: true }],
  context: async ({ context, consent }, use) => {
    if (consent) await context.addInitScript(() => localStorage.setItem("amc.consent", '"all"'));
    await use(context);
  },
});

export { expect };
