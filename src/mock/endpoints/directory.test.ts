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
