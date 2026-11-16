import { describe, expect, it } from "vitest";
import { receiptFileName, receiptPdf } from "./receiptPdf";

describe("receiptPdf", () => {
  const pdf = receiptPdf({ receiptNo: "AMC/WT/2026/004817", issuedAt: "16/11/2026 10:30", rows: [["Transaction ID", "APY123"], ["Amount (₹)", "Rs. 332.50"], ["Note", "a (b) \\ c"]] });

  it("is a PDF with the receipt details", () => {
    expect(pdf.startsWith("%PDF-1.4\n")).toBe(true);
    expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(pdf).toContain("(AMC/WT/2026/004817)".replace("(", "(Receipt No. "));
    expect(pdf).toContain("(APY123)");
    expect(pdf).toContain("(a \\(b\\) \\\\ c)");
    expect(pdf).not.toContain("₹");
  });

  it("has a cross-reference table pointing at each object", () => {
    const startxref = Number(/startxref\n(\d+)/.exec(pdf)![1]);
    expect(pdf.slice(startxref, startxref + 4)).toBe("xref");
    const offsets = [...pdf.slice(startxref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    expect(offsets).toHaveLength(6);
    offsets.forEach((o, i) => expect(pdf.slice(o).startsWith(`${i + 1} 0 obj`)).toBe(true));
  });

  it("names the file after the receipt number", () => {
    expect(receiptFileName("AMC/WT/2026/004817")).toBe("AMC-WT-2026-004817-receipt.pdf");
  });
});
