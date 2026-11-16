import { describe, expect, it } from "vitest";
import { rankSearch } from "./search";

describe("service search ranking", () => {
  it("finds water services for 'water'", () => expect(rankSearch("water").slice(0, 2).map((r) => r.id).sort()).toEqual(["water-history", "water-pay"]));
  it("requires all terms to match", () => expect(rankSearch("water birth")).toEqual([]));
  it("matches keywords and Tamil text", () => {
    expect(rankSearch("pothole").map((r) => r.id)).toContain("griev-new");
    expect(rankSearch("பிறப்புச்").map((r) => r.id)).toContain("cert-birth");
  });
  it("caps results at 6 and ignores blank queries", () => {
    expect(rankSearch("a").length).toBeLessThanOrEqual(6);
    expect(rankSearch("   ")).toEqual([]);
  });
});
