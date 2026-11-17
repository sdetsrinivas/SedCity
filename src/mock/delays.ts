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
  ZONE_LIST: { spec: fixed(800), page: "/services/electricity/new-connection", element: "Premises step → Zone dropdown options", traps: ["DRP-08"] },
  WARD_LIST: { spec: fixed(2000), page: "/services/electricity/new-connection", element: "Premises step → Ward dropdown options", traps: ["DRP-08"] },
  STREET_LIST: { spec: random(1000, 4000), page: "/services/electricity/new-connection", element: "Premises step → Street dropdown options", traps: ["DRP-08"] },
  // ── Electricity: new connection ─────────────────────────────────
  STEP_ANIMATION: { spec: fixed(450), page: "/services/electricity/new-connection", element: "Wizard step slide-in (not clickable until it ends)", traps: ["DYN-04"] },
  REVIEW_BANNER: { spec: fixed(1500), page: "/services/electricity/new-connection", element: "Review step → estimated-charges banner (pushes Submit down)", traps: ["BTN-05"] },
  ELEC_SUBMIT: { spec: fixed(1500), page: "/services/electricity/new-connection", element: "Submit application button", traps: [] },
  // ── Water: bill payment ─────────────────────────────────────────
  CONSUMER_LOOKUP: { spec: fixed(2000), page: "/services/water/pay", element: "Fetch bill → Bill details panel (appears when the lookup returns)", traps: ["DYN-01"] },
  PAY_OVERLAY: { spec: fixed(1500), page: "/services/water/pay", element: "Payment options → overlay over 'Proceed to pay' (on first show and after changing the method)", traps: ["BTN-04"] },
  // ── Property tax: self-assessment ───────────────────────────────
  ASSESSMENT_DEBOUNCE: { spec: fixed(500), page: "/services/property-tax/assess", element: "Assessment number input (pause after typing before it is verified)", traps: ["TXT-13"] },
  ASSESSMENT_CHECK: { spec: fixed(1000), page: "/services/property-tax/assess", element: "Assessment number → 'Verifying…' then the owner/address or an error below the field", traps: ["TXT-13"] },
  LOCALITY_PAGE: { spec: fixed(700), page: "/services/property-tax/assess", element: "Locality list → each further page of ten localities, loaded when the list is scrolled to its end", traps: ["DRP-06"] },
  // ── Grievances: registration ────────────────────────────────────
  GRIEVANCE_SUBMIT: { spec: fixed(1500), page: "/grievances/new", element: "Submit grievance button → 'Submitting…' then the acknowledgement with the grievance number (the no-ward alert comes before this, without delay)", traps: ["DLG-01"] },
  // ── Grievances: tracking ────────────────────────────────────────
  GRIEVANCE_LOOKUP: { spec: fixed(1000), page: "/grievances/track", element: "Track button → 'Searching…' then the status card (or 'No grievance found')", traps: ["TXT-05"] },
  GRIEVANCE_POLL: { spec: interval(5000), page: "/grievances/track", element: "Status card → pause between automatic status checks (until the grievance is resolved)", traps: ["DYN-05"] },
  GRIEVANCE_STATUS: { spec: fixed(600), page: "/grievances/track", element: "Status card → 'Checking for updates…' during each automatic check; a new grievance moves on one stage per check up to 'Inspection scheduled'", traps: ["DYN-05"] },
  GRIEVANCE_UPDATE: { spec: fixed(1000), page: "/grievances/track", element: "Reschedule inspection → 'Confirm new date', and Rate the resolution → 'Submit feedback' ('Saving…' then the confirmation)", traps: ["DAT-06", "OTH-09"] },
  // ── Certificates: birth ─────────────────────────────────────────
  BIRTH_SUBMIT: { spec: fixed(1500), page: "/certificates/birth", element: "Submit application button → 'Submitting…' then the acknowledgement with the application number (the leave-page prompt stops once it is shown)", traps: ["DLG-04"] },
  // ── Certificates: trade licence ─────────────────────────────────
  TRADE_FEE: { spec: fixed(800), page: "/certificates/trade-license", element: "6. Fee and declaration → fee badge 'Calculating…' then the annual fee, after the business category or floor area changes", traps: ["SHD-03"] },
  TRADE_SUBMIT: { spec: fixed(1500), page: "/certificates/trade-license", element: "Submit application button → 'Submitting…' then the acknowledgement with the application number (the leave-page prompt stops once it is shown)", traps: ["DLG-04"] },
  // ── AstheenPay gateway (/pay/astheenpay/checkout, in an iframe or popup; used by water and property tax) ──
  GATEWAY_LOAD: { spec: fixed(1200), page: "/pay/astheenpay/checkout", element: "Checkout form (in the iframe or popup) after 'Connecting securely…'", traps: ["FRM-01", "DLG-15"] },
  GATEWAY_OTP_SEND: { spec: fixed(800), page: "/pay/astheenpay/checkout", element: "Pay button → OTP modal inside the iframe/popup", traps: ["DLG-08"] },
  GATEWAY_OTP_VERIFY: { spec: fixed(1000), page: "/pay/astheenpay/checkout", element: "OTP modal → Verify and pay button", traps: ["DLG-08"] },
  GATEWAY_RETURN: { spec: fixed(1500), page: "/pay/astheenpay/checkout", element: "'Payment successful, returning…' before the receipt shows on the paying page, /services/water/pay or /services/property-tax/assess (popup closes)", traps: ["FRM-01", "DLG-15", "FIL-05"] },
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
