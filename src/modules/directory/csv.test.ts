import { describe, expect, it } from "vitest";
import { csvField, exportFileName, toCsv } from "./csv";

describe("directory CSV", () => {
  it("quotes only fields that need it and doubles quotes", () => {
    expect(csvField("Chief Engineer")).toBe("Chief Engineer");
    expect(csvField("Superintending Engineer (Roads, Bridges and Buildings)")).toBe('"Superintending Engineer (Roads, Bridges and Buildings)"');
    expect(csvField('The "Ripon" office')).toBe('"The ""Ripon"" office"');
    expect(csvField("two\nlines")).toBe('"two\nlines"');
  });

  it("starts with a BOM and uses CRLF line endings", () => {
    const csv = toCsv([["Name", "Office"], ["G. Dinesh", "Zone I – Thenmalai"]]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe("Name,Office\r\nG. Dinesh,Zone I – Thenmalai\r\n");
  });

  it("names the file after the department", () => {
    expect(exportFileName("")).toBe("amc-officials-all.csv");
    expect(exportFileName("engineering")).toBe("amc-officials-engineering.csv");
  });
});
