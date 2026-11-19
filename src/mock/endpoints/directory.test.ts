import { describe, expect, it } from "vitest";
import { DEFAULT_QUERY, DEPARTMENTS, departmentById, matchOfficials, OFFICIALS, officeName, phoneHref, queryOfficials } from "./directory";

describe("officials directory data", () => {
  it("has 61 officials in 13 departments, with unique names, emails and extensions", () => {
    expect(OFFICIALS).toHaveLength(61);
    expect(DEPARTMENTS).toHaveLength(13);
    for (const key of ["id", "email", "ext"] as const) expect(new Set(OFFICIALS.map((o) => o[key])).size).toBe(61);
    expect(new Set(OFFICIALS.map((o) => o.name.en)).size).toBe(61);
    expect(new Set(OFFICIALS.map((o) => o.name.ta)).size).toBe(61);
  });

  it("every official has a known department and office and English + Tamil text", () => {
    for (const o of OFFICIALS) {
      expect(departmentById(o.department), o.id).toBeDefined();
      expect(officeName(o.office).en, o.id).toMatch(/^(Corporation Head Office|Zone [IV]+ – )/);
      for (const t of [o.name, o.designation]) {
        expect(t.en.length, o.id).toBeGreaterThan(3);
        expect(t.ta.length, o.id).toBeGreaterThan(3);
      }
      expect(o.email).toMatch(/^[a-z]+\.[a-z]@amc\.example$/);
    }
    expect(phoneHref(OFFICIALS[0])).toBe("tel:1552026,201");
  });
});

describe("queryOfficials", () => {
  it("pages ten at a time in the published order and clamps past the end", () => {
    const first = queryOfficials(DEFAULT_QUERY, "en");
    expect(first).toMatchObject({ page: 0, pages: 7, total: 61 });
    expect(first.rows.map((o) => o.id)).toEqual(OFFICIALS.slice(0, 10).map((o) => o.id));
    const last = queryOfficials({ ...DEFAULT_QUERY, page: 99 }, "en");
    expect(last.page).toBe(6);
    expect(last.rows).toHaveLength(1);
  });

  it("filters by department and by text in either language", () => {
    expect(matchOfficials({ ...DEFAULT_QUERY, department: "engineering" }, "en")).toHaveLength(8);
    const chief = matchOfficials({ ...DEFAULT_QUERY, q: "chief" }, "en").map((o) => o.designation.en);
    expect(chief).toEqual(["Chief Accounts Officer", "Chief Engineer"]);
    expect(matchOfficials({ ...DEFAULT_QUERY, q: "செயற்பொறியாளர்" }, "en").length).toBe(8);
    expect(matchOfficials({ ...DEFAULT_QUERY, department: "parks", q: "engineer" }, "en")).toHaveLength(0);
  });

  it("sorts by a column in both directions, ties in published order", () => {
    const asc = matchOfficials({ ...DEFAULT_QUERY, sort: "name", dir: "asc" }, "en").map((o) => o.name.en);
    expect(asc).toEqual([...asc].sort((a, b) => a.localeCompare(b, "en-IN", { sensitivity: "base" })));
    const desc = matchOfficials({ ...DEFAULT_QUERY, sort: "name", dir: "desc" }, "en").map((o) => o.name.en);
    expect(desc).toEqual([...asc].reverse());
    const byOffice = matchOfficials({ ...DEFAULT_QUERY, sort: "office", dir: "asc" }, "en");
    expect(officeName(byOffice[0].office).en).toBe("Corporation Head Office");
    expect(byOffice[0].id).toBe("OFF-001"); // published order breaks the tie
    expect(officeName(byOffice[60].office).en).toBe("Zone VI – Kadalkarai");
  });
});

describe("offices", () => {
  it("has 103 offices of six kinds with unique ids, names and extensions not shared with officials", async () => {
    const { OFFICES, OFFICE_KINDS, officeServices } = await import("./directory");
    expect(OFFICES).toHaveLength(103);
    expect(OFFICE_KINDS.map((k) => k.id)).toEqual(["head", "zone", "ward", "csc", "water", "health"]);
    for (const key of ["id", "ext"] as const) expect(new Set(OFFICES.map((o) => o[key])).size).toBe(103);
    expect(new Set(OFFICES.map((o) => o.name.en)).size).toBe(103);
    expect(new Set(OFFICES.map((o) => o.name.ta)).size).toBe(103);
    const officialExts = new Set(OFFICIALS.map((o) => o.ext));
    expect(OFFICES.filter((o) => officialExts.has(o.ext))).toEqual([]);
    for (const k of OFFICE_KINDS) {
      expect(k.hours).toHaveLength(7);
      expect(officeServices(k.id).every(Boolean)).toBe(true);
      expect(k.services.at(-1)).toBe("grievance");
    }
  });

  it("every office lies inside the city and in a known ward", async () => {
    const { OFFICES, CITY_BOUNDS } = await import("./directory");
    const { wardById } = await import("./geo");
    for (const o of OFFICES) {
      expect(wardById(o.wardId), o.id).toBeDefined();
      expect(o.lat).toBeLessThanOrEqual(CITY_BOUNDS.north);
      expect(o.lat).toBeGreaterThanOrEqual(CITY_BOUNDS.north - CITY_BOUNDS.latSpan);
      expect(o.lng).toBeGreaterThanOrEqual(CITY_BOUNDS.west);
      expect(o.lng).toBeLessThanOrEqual(CITY_BOUNDS.west + CITY_BOUNDS.lngSpan);
    }
  });

  it("measures distance and ranks offices nearest first", async () => {
    const { distanceKm, rankOffices, officeById, CITY_CENTRE } = await import("./directory");
    expect(distanceKm({ lat: 12, lng: 79 }, { lat: 13, lng: 79 })).toBeCloseTo(111.2, 1);
    const ho = officeById("HO")!;
    const near = rankOffices({ lat: ho.lat + 0.001, lng: ho.lng });
    expect(near.ranked[0]).toMatchObject({ id: "HO" });
    expect(near.ranked[0].km).toBeCloseTo(0.11, 2);
    expect(near.ranked).toHaveLength(103);
    for (let i = 1; i < near.ranked.length; i++) expect(near.ranked[i].km).toBeGreaterThanOrEqual(near.ranked[i - 1].km);
    expect(near.outside).toBe(false);
    const far = rankOffices({ lat: CITY_CENTRE.lat + 1, lng: CITY_CENTRE.lng });
    expect(far.outside).toBe(true);
    expect(far.fromCentreKm).toBeCloseTo(111.2, 0);
  });

  it("filters by kind and by name, street, locality or PIN code, in either language", async () => {
    const { matchOffices, OFFICES } = await import("./directory");
    expect(matchOffices("", "")).toHaveLength(103);
    expect(matchOffices("zone", "")).toHaveLength(6);
    expect(matchOffices("ward", "")).toHaveLength(48);
    expect(matchOffices("", "ripon mahal").map((o) => o.id)).toEqual(["HO", "WO-17", "UHC-07"]);
    expect(matchOffices("", "600901").map((o) => o.id)).toContain("HO");
    expect(matchOffices("", "தேன்மலை").length).toBeGreaterThan(0);
    expect(matchOffices("", "zzzz")).toEqual([]);
    const reversed = OFFICES.map((o) => o.id).reverse();
    expect(matchOffices("zone", "", reversed).map((o) => o.id)).toEqual(["ZO-6", "ZO-5", "ZO-4", "ZO-3", "ZO-2", "ZO-1"]);
  });
});
