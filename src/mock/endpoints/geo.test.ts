import { describe, expect, it } from "vitest";
import geo from "../data/geo.json";
import users from "../data/users.json";
import { streetsOf, wardsOf } from "./geo";

describe("geography mock data", () => {
  it("has 6 zones with 8 wards each, numbered 1–48", () => {
    expect(geo.zones).toHaveLength(6);
    for (const z of geo.zones) expect(wardsOf(z.id)).toHaveLength(8);
    expect(geo.wards.map((w) => w.no)).toEqual(Array.from({ length: 48 }, (_, i) => i + 1));
  });
  it("every ward has 6–10 unique streets with a 6-digit pincode", () => {
    for (const w of geo.wards) {
      const s = streetsOf(w.id);
      expect(s.length, w.id).toBeGreaterThanOrEqual(6);
      expect(s.length, w.id).toBeLessThanOrEqual(10);
      expect(new Set(s.map((x) => x.name)).size).toBe(s.length);
      for (const x of s) expect(x.pincode).toMatch(/^\d{6}$/);
    }
  });
  it("ids are unique and every ward has en + ta names", () => {
    const ids = [...geo.zones, ...geo.wards, ...geo.streets].map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const w of geo.wards) expect(w.ta).toMatch(/^வார்டு \d+ – /);
  });
  it("seeded citizens' wards exist", () => {
    for (const u of users.filter((x) => x.role === "citizen")) {
      const no = Number(/Ward (\d+)/.exec(u.ward)![1]);
      expect(geo.wards.find((w) => w.no === no)!.en).toBe(u.ward);
    }
  });
});
