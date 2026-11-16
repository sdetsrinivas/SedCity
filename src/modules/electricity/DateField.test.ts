import { describe, expect, it } from "vitest";
import { maskDDMMYYYY } from "./DateField";

describe("DD/MM/YYYY mask (DAT-05)", () => {
  it.each([
    ["", ""], ["0", "0"], ["05", "05"], ["051", "05/1"], ["0512", "05/12"], ["05122026", "05/12/2026"],
    ["05/12/2026", "05/12/2026"], ["051220261234", "05/12/2026"], ["2026-12-05", "20/26/1205"],
  ])("%j → %j", (input, out) => expect(maskDDMMYYYY(input)).toBe(out));
});
