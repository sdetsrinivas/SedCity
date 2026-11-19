import { describe, expect, it } from "vitest";
import { CITY_BOUNDS, officeById } from "@/mock/endpoints/directory";
import { HEIGHT, PAD, WIDTH } from "@/modules/grievance/mapGeometry";
import { formatKm, rowMeta, toMapPoint, weekdayIndex } from "./offices";

describe("office helpers", () => {
  it("maps the city corners onto the ward map", () => {
    expect(toMapPoint({ lat: CITY_BOUNDS.north, lng: CITY_BOUNDS.west })).toEqual({ x: PAD, y: PAD });
    expect(toMapPoint({ lat: CITY_BOUNDS.north - CITY_BOUNDS.latSpan, lng: CITY_BOUNDS.west + CITY_BOUNDS.lngSpan })).toEqual({ x: WIDTH - PAD, y: HEIGHT - PAD });
  });

  it("formats distances with one decimal", () => {
    expect(formatKm(0.44, "en")).toBe("0.4");
    expect(formatKm(12, "en")).toBe("12.0");
    expect(formatKm(1234.56, "en")).toBe("1,234.6");
  });

  it("describes a row by type, street and locality", () => {
    expect(rowMeta(officeById("HO")!, "en")).toBe("Head office · Ripon Mahal, Kalaivani Square");
    expect(rowMeta(officeById("HO")!, "ta")).toBe("தலைமை அலுவலகம் · Ripon Mahal, கலைவாணி சதுக்கம்");
  });

  it("counts weekdays from Monday", () => {
    expect(weekdayIndex(new Date(2026, 10, 16))).toBe(0);
    expect(weekdayIndex(new Date(2026, 10, 22))).toBe(6);
  });
});
