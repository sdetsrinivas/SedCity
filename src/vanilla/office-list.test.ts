import { describe, expect, it } from "vitest";
import { scrollFor, visibleRange } from "./office-list.js";

describe("office list virtualisation", () => {
  it("renders the rows in view plus three on each side", () => {
    expect(visibleRange(0, 500, 76, 103)).toEqual({ first: 0, last: 9 });
    expect(visibleRange(760, 500, 76, 103)).toEqual({ first: 7, last: 19 });
    expect(visibleRange(103 * 76 - 500, 500, 76, 103)).toEqual({ first: 93, last: 102 });
    expect(visibleRange(0, 500, 76, 0).last).toBeLessThan(0);
    expect(visibleRange(0, 500, 76, 2)).toEqual({ first: 0, last: 1 });
  });

  it("scrolls only as far as needed to show a row", () => {
    expect(scrollFor(2, 0, 500, 76)).toBe(0);
    expect(scrollFor(10, 0, 500, 76)).toBe(11 * 76 - 500);
    expect(scrollFor(3, 400, 500, 76)).toBe(228);
  });
});
