import { describe, expect, it } from "vitest";
import { en } from "./en";
import { ta } from "./ta";
import { translate, pick } from "./index";

describe("dictionaries", () => {
  it("Tamil has exactly the English keys", () => {
    expect(Object.keys(ta).sort()).toEqual(Object.keys(en).sort());
  });
  it("no Tamil string is empty or left in English (except brand/acronyms)", () => {
    const allowSame = new Set(["corp.short"]);
    for (const [k, v] of Object.entries(ta)) {
      expect(v.trim(), k).not.toBe("");
      if (!allowSame.has(k)) expect(v, k).not.toBe(en[k as keyof typeof en]);
    }
  });
  it("placeholders match between languages", () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    for (const k of Object.keys(en) as (keyof typeof en)[]) expect(ph(ta[k]), k).toEqual(ph(en[k]));
  });
  it("interpolates variables", () => {
    expect(translate(en, "session.body", { seconds: 42 })).toContain("42 seconds");
    expect(pick({ en: "a", ta: "b" }, "ta")).toBe("b");
  });
});
