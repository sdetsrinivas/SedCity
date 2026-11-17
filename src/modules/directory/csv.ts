/** RFC 4180 field: quoted only when it holds a comma, a double quote or a line break (quotes doubled). */
export function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * FIL-06: the file is UTF-8 with a byte-order mark (so spreadsheet programs read Tamil correctly),
 * CRLF line endings and a header row.
 */
export function toCsv(rows: string[][]): string {
  return `﻿${rows.map((r) => r.map(csvField).join(",")).join("\r\n")}\r\n`;
}

export const exportFileName = (department: string) => `amc-officials-${department || "all"}.csv`;
