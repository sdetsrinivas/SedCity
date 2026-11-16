import { describe, expect, it } from "vitest";
import geo from "@/mock/data/geo.json";
import { CELL, COLS, HEIGHT, PAD, ROWS, WIDTH, cellOf, wardShapes, zoneShapes } from "./mapGeometry";

const zoneIds = geo.zones.map((z) => z.id);

describe("ward map geometry", () => {
  const shapes = wardShapes(geo.wards, zoneIds);

  it("draws all 48 wards, each in its own grid cell", () => {
    expect(shapes).toHaveLength(48);
    const cells = new Set(zoneIds.flatMap((_, zi) => Array.from({ length: 8 }, (__, wi) => JSON.stringify(cellOf(zi, wi)))));
    expect(cells.size).toBe(COLS * ROWS);
  });

  it("is deterministic and stays inside the view box", () => {
    expect(wardShapes(geo.wards, zoneIds)).toEqual(shapes);
    for (const w of shapes) {
      const nums = w.d.match(/-?\d+(\.\d+)?/g)!.map(Number);
      for (let i = 0; i < nums.length; i += 2) {
        expect(nums[i]).toBeGreaterThanOrEqual(PAD);
        expect(nums[i]).toBeLessThanOrEqual(WIDTH - PAD);
        expect(nums[i + 1]).toBeGreaterThanOrEqual(PAD);
        expect(nums[i + 1]).toBeLessThanOrEqual(HEIGHT - PAD);
      }
    }
  });

  it("keeps each ward's label near the middle of its cell", () => {
    const w14 = shapes.find((w) => w.id === "W14")!;
    // Zone II is the top-right block; ward 14 is its 6th ward → column 5, row 1.
    expect(cellOf(1, 5)).toEqual({ col: 5, row: 1 });
    expect(Math.abs(w14.cx - (PAD + 5.5 * CELL))).toBeLessThan(10);
    expect(Math.abs(w14.cy - (PAD + 1.5 * CELL))).toBeLessThan(10);
  });

  it("outlines six zones", () => {
    expect(zoneShapes(zoneIds)).toHaveLength(6);
  });
});
