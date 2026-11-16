/**
 * Every simulated delay used anywhere on the portal is registered here by name.
 * The trap guide lists each entry with its page and element.
 *
 * Overrides (tests only, never surfaced in the UI): a cookie named `amc_mock`
 * holding URL-encoded JSON, e.g. {"scale":0,"delays":{"SESSION_WARN":1500},"fail":["CONSUMER_LOOKUP"]}.
 */

export type DelaySpec =
  | { kind: "fixed"; ms: number }
  | { kind: "random"; min: number; max: number }
  | { kind: "interval"; ms: number };

export interface DelayEntry {
  spec: DelaySpec;
  page: string;
  element: string;
  traps: string[];
}

const fixed = (ms: number): DelaySpec => ({ kind: "fixed", ms });
const random = (min: number, max: number): DelaySpec => ({ kind: "random", min, max });
const interval = (ms: number): DelaySpec => ({ kind: "interval", ms });

export const DELAYS = {
  // ── Shell / home ────────────────────────────────────────────────
  SEARCH_DEBOUNCE: { spec: fixed(300), page: "/", element: "Global search input (debounce before request)", traps: ["TXT-14"] },
  SEARCH_SUGGEST: { spec: fixed(600), page: "/", element: "Global search suggestion list", traps: ["TXT-14"] },
  STREAM_ANNOUNCEMENTS: { spec: fixed(2000), page: "/", element: "Announcements panel (server-streamed)", traps: [] },
  HYDRATE_HOME: { spec: fixed(4000), page: "/", element: "Quick Pay card 'Pay now' button", traps: ["HYD-01"] },
  CAROUSEL_ROTATE: { spec: interval(6000), page: "/", element: "Announcement carousel auto-rotation", traps: ["OTH-17"] },
  // ── Auth ────────────────────────────────────────────────────────
  LOGIN_CHECK: { spec: fixed(700), page: "/login", element: "Sign in button (credential check)", traps: ["BTN-06"] },
  OTP_SEND: { spec: fixed(800), page: "/login", element: "OTP toast and SMS inbox entry", traps: ["DLG-09", "OTH-25"] },
  OTP_VERIFY: { spec: fixed(600), page: "/login", element: "Verify OTP button", traps: ["OTH-25"] },
  TOAST_TTL: { spec: fixed(3000), page: "(global)", element: "Auto-dismissing toast", traps: ["DLG-09"] },
  HYDRATE_REGISTER: { spec: fixed(3000), page: "/register", element: "Terms & conditions checkbox", traps: ["CHK-09"] },
  REGISTER_SUBMIT: { spec: fixed(1200), page: "/register", element: "Create account button", traps: [] },
  SESSION_WARN: { spec: fixed(240_000), page: "(signed-in pages)", element: "Session timeout warning modal (idle time before it opens)", traps: ["DLG-05"] },
  SESSION_COUNTDOWN: { spec: fixed(60_000), page: "(signed-in pages)", element: "Session timeout modal countdown", traps: ["DLG-05"] },
  // ── Shared geography (zone → ward → street) ─────────────────────
  ZONE_LIST: { spec: fixed(800), page: "/services/electricity/new-connection", element: "Zone dropdown options", traps: [] },
  WARD_LIST: { spec: fixed(2000), page: "/services/electricity/new-connection", element: "Ward dropdown options", traps: [] },
  STREET_LIST: { spec: random(1000, 4000), page: "/services/electricity/new-connection", element: "Street dropdown options", traps: [] },
} as const satisfies Record<string, DelayEntry>;

export type DelayName = keyof typeof DELAYS;

export interface MockOverrides {
  /** Multiplier applied to every delay that has no explicit override. */
  scale?: number;
  /** Absolute ms per delay name. */
  delays?: Partial<Record<DelayName, number>>;
  /** Names of calls that must fail. */
  fail?: DelayName[];
}

export const MOCK_COOKIE = "amc_mock";

export function parseOverrides(raw: string | undefined | null): MockOverrides {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    return parsed && typeof parsed === "object" ? (parsed as MockOverrides) : {};
  } catch {
    return {};
  }
}

export function resolveDelay(
  name: DelayName,
  overrides: MockOverrides = {},
  rng: () => number = Math.random,
): number {
  const explicit = overrides.delays?.[name];
  if (typeof explicit === "number") return Math.max(0, explicit);
  const spec: DelaySpec = DELAYS[name].spec;
  const base = spec.kind === "random" ? spec.min + Math.round(rng() * (spec.max - spec.min)) : spec.ms;
  const scale = typeof overrides.scale === "number" ? overrides.scale : 1;
  return Math.max(0, Math.round(base * scale));
}

export function describeDelay(spec: DelaySpec): string {
  const fmt = (ms: number) => (ms >= 1000 && ms % 1000 === 0 ? `${ms / 1000}s` : ms >= 1000 ? `${ms / 1000}s` : `${ms}ms`);
  if (spec.kind === "random") return `random ${fmt(spec.min)}–${fmt(spec.max)}`;
  if (spec.kind === "interval") return `every ${fmt(spec.ms)}`;
  return fmt(spec.ms);
}
