import { describe, expect, it } from "vitest";
import { DELAYS, describeDelay, parseOverrides, resolveDelay, type DelayName } from "./delays";

describe("delay registry", () => {
  it("every entry has page, element and a positive spec", () => {
    for (const [name, d] of Object.entries(DELAYS)) {
      expect(d.page, name).toBeTruthy();
      expect(d.element, name).toBeTruthy();
      const spec = d.spec as { kind: string; ms?: number; min?: number; max?: number };
      if (spec.kind === "random") expect(spec.max!).toBeGreaterThan(spec.min!);
      else expect(spec.ms!).toBeGreaterThan(0);
    }
  });

  it("resolves fixed delays", () => {
    expect(resolveDelay("SEARCH_SUGGEST")).toBe(600);
    expect(resolveDelay("HYDRATE_HOME")).toBe(4000);
  });

  it("applies scale and explicit overrides", () => {
    expect(resolveDelay("SEARCH_SUGGEST", { scale: 0 })).toBe(0);
    expect(resolveDelay("SEARCH_SUGGEST", { scale: 0.5 })).toBe(300);
    expect(resolveDelay("SESSION_WARN", { scale: 0, delays: { SESSION_WARN: 1500 } })).toBe(1500);
    expect(resolveDelay("SESSION_WARN", { delays: { SESSION_WARN: -5 } })).toBe(0);
  });

  it("random delays stay inside their range", () => {
    // Inject a temporary random entry by casting — the real registry gets them in later phases.
    const name = "SEARCH_SUGGEST" as DelayName;
    const original = DELAYS[name].spec;
    (DELAYS[name] as { spec: unknown }).spec = { kind: "random", min: 1000, max: 4000 };
    try {
      expect(resolveDelay(name, {}, () => 0)).toBe(1000);
      expect(resolveDelay(name, {}, () => 1)).toBe(4000);
      expect(resolveDelay(name, {}, () => 0.5)).toBe(2500);
    } finally {
      (DELAYS[name] as { spec: unknown }).spec = original;
    }
  });

  it("parses the override cookie defensively", () => {
    expect(parseOverrides(encodeURIComponent('{"scale":0}'))).toEqual({ scale: 0 });
    expect(parseOverrides("not json")).toEqual({});
    expect(parseOverrides(undefined)).toEqual({});
  });

  it("describes delays for the guide", () => {
    expect(describeDelay({ kind: "fixed", ms: 800 })).toBe("800ms");
    expect(describeDelay({ kind: "fixed", ms: 2000 })).toBe("2s");
    expect(describeDelay({ kind: "random", min: 1000, max: 4000 })).toBe("random 1s–4s");
    expect(describeDelay({ kind: "interval", ms: 5000 })).toBe("every 5s");
  });
});
