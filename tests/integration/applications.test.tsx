import { describe, expect, it } from "vitest";
import { findApplication, listApplications, nextReference, saveApplication } from "@/lib/applications";
import { listWards, listStreets } from "@/mock/endpoints/geo";

describe("applications store", () => {
  it("issues sequential, service-specific reference numbers", () => {
    const now = new Date(2026, 10, 15);
    const a = nextReference("electricity", now);
    const b = nextReference("electricity", now);
    expect(a).toMatch(/^AMC\/EL\/2026\/\d{6}$/);
    expect(Number(b.slice(-6))).toBe(Number(a.slice(-6)) + 1);
    expect(nextReference("water", now)).toMatch(/^AMC\/WT\/2026\//);
  });

  it("saves, de-duplicates by reference and finds case-insensitively", () => {
    const app = { ref: "AMC/EL/2026/004901", service: "electricity" as const, title: "New connection", submittedAt: new Date().toISOString(), status: "Submitted" as const, details: {} };
    saveApplication(app);
    saveApplication({ ...app, status: "Approved" });
    expect(listApplications()).toHaveLength(1);
    expect(findApplication(" amc/el/2026/004901 ")?.status).toBe("Approved");
  });

  it("geo endpoints go through the mock api (delays scaled to 0 in tests)", async () => {
    const wards = await listWards("Z2");
    expect(wards.map((w) => w.no)).toEqual([9, 10, 11, 12, 13, 14, 15, 16]);
    expect((await listStreets("W14")).every((s) => s.wardId === "W14")).toBe(true);
  });
});
