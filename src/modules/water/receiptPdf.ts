/**
 * FIL-05: builds a one-page PDF payment receipt in the browser (no library, no server).
 * Standard Helvetica only covers Latin-1, so amounts are written "Rs. 332.50" and the receipt is in English.
 */

export interface ReceiptPdfData {
  receiptNo: string;
  rows: [string, string][];
  issuedAt: string;
}

const esc = (s: string) => s.replace(/[^\x20-\x7e]/g, "").replace(/([\\()])/g, "\\$1");

export function receiptPdf({ receiptNo, rows, issuedAt }: ReceiptPdfData): string {
  const ops: string[] = [];
  const text = (x: number, y: number, size: number, font: "F1" | "F2", s: string) =>
    ops.push(`BT /${font} ${size} Tf ${x} ${y} Td (${esc(s)}) Tj ET`);

  text(56, 780, 16, "F2", "Astheenapuram Municipal Corporation");
  text(56, 760, 11, "F1", "Water Supply and Sewerage Department");
  text(56, 724, 14, "F2", "Payment Receipt");
  text(56, 706, 10, "F1", `Receipt No. ${receiptNo}`);
  ops.push("0.6 w 56 694 m 539 694 l S");
  let y = 668;
  for (const [k, v] of rows) {
    text(56, y, 10, "F1", k);
    text(250, y, 10, "F2", v);
    y -= 20;
  }
  ops.push(`0.6 w 56 ${y + 6} m 539 ${y + 6} l S`);
  text(56, y - 16, 9, "F1", `Issued on ${issuedAt}. This is a computer-generated receipt and needs no signature.`);

  const stream = ops.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return out;
}

/** "AMC/WT/2026/004817" → "AMC-WT-2026-004817-receipt.pdf" */
export const receiptFileName = (receiptNo: string) => `${receiptNo.replace(/\//g, "-")}-receipt.pdf`;
