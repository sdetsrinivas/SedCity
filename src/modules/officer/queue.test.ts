import { describe, expect, it } from "vitest";
import {
  HOUR, INCOMING_COUNT, applyClaims, arrivedItem, dueSoon, hourStart, seededHistory, seededItems, sortBySla, splitLeft,
  wardShort, wardsOfZone, zoneOf,
} from "./queue";

const ANCHOR = new Date(2026, 10, 20, 12, 0, 0).getTime();
const nos = (refs: { ref: string }[]) => refs.map((r) => Number(r.ref.slice(-6)));
const SEEDED_ORDER = [4702, 4705, 4711, 4716, 4719, 4723, 4728, 4730, 4734, 4737, 4741, 4744, 4748, 4752];

describe("officer queue", () => {
  it("puts the seeded grievances in SLA order, overdue ones first", () => {
    const items = sortBySla(seededItems(ANCHOR));
    expect(nos(items)).toEqual(SEEDED_ORDER);
    expect(items[0].ref).toBe("AMC/GR/2026/004702");
    expect(Date.parse(items[0].due)).toBe(ANCHOR - 8 * HOUR);
    expect(Date.parse(items[1].due)).toBeLessThan(ANCHOR);
    expect(Date.parse(items[2].due)).toBeGreaterThan(ANCHOR);
  });

  it("inserts each arrival at the same place whenever in the hour after the anchor it arrives", () => {
    for (const offset of [...Array.from({ length: 60 }, (_, m) => m * 60_000), HOUR - 1]) {
      const base = seededItems(ANCHOR);
      const one = nos(sortBySla([...base, arrivedItem(0, ANCHOR + offset)]));
      expect(one.indexOf(4757), `offset ${offset}`).toBe(7);
      const all = nos(sortBySla([...base, ...Array.from({ length: INCOMING_COUNT }, (_, i) => arrivedItem(i, ANCHOR + offset + i * 1000))]));
      expect(all).toEqual([4702, 4705, 4711, 4716, 4719, 4723, 4728, 4757, 4730, 4734, 4737, 4759, 4741, 4744, 4762, 4748, 4752]);
    }
  });

  it("the anchor is the start of the hour", () => {
    expect(hourStart(ANCHOR + 59 * 60_000 + 59_000)).toBe(ANCHOR);
  });

  it("the queue officer's zone has eight wards and every grievance is in one of them", () => {
    const wards = wardsOfZone(zoneOf("officer.selvi")).map((w) => w.id);
    expect(wards).toEqual(["W09", "W10", "W11", "W12", "W13", "W14", "W15", "W16"]);
    for (const it of seededItems(ANCHOR)) expect(wards).toContain(it.ward);
    expect(wardsOfZone(zoneOf("meena.r"))).toEqual([]);
  });

  it("splits the time left into days and hh:mm:ss, also when overdue", () => {
    expect(splitLeft(ANCHOR + 2 * 24 * HOUR + 3 * HOUR + 4 * 60_000 + 5_000, ANCHOR)).toEqual({ overdue: false, days: 2, time: "03:04:05" });
    expect(splitLeft(ANCHOR - 6 * HOUR - 1000, ANCHOR)).toEqual({ overdue: true, days: 0, time: "06:00:01" });
    expect(dueSoon(ANCHOR + 23 * HOUR, ANCHOR)).toBe(true);
    expect(dueSoon(ANCHOR + 25 * HOUR, ANCHOR)).toBe(false);
    expect(dueSoon(ANCHOR - 1, ANCHOR)).toBe(false);
  });

  it("claims saved in the browser override the seeded ones; null releases", () => {
    const items = applyClaims(seededItems(ANCHOR), {
      "AMC/GR/2026/004711": { by: "officer.selvi", at: "2026-11-20T07:00:00.000Z" },
      "AMC/GR/2026/004730": { by: null, at: "2026-11-20T07:00:00.000Z" },
    });
    const by = (no: number) => items.find((i) => i.ref.endsWith(String(no)))!;
    expect(by(4711).claimedBy).toBe("officer.selvi");
    expect(by(4730).claimedBy).toBeNull();
    expect(by(4719).claimedBy).toBe("ravi.k");
  });

  it("builds the seeded history, oldest first", () => {
    const item = seededItems(ANCHOR).find((i) => i.ref.endsWith("4730"))!;
    const h = seededHistory(item);
    expect(h.map((x) => x.kind)).toEqual(["received", "assigned", "photo", "claimed"]);
    expect(h[3].by).toBe("officer.selvi");
    expect(Date.parse(h[3].at)).toBe(ANCHOR - 26 * HOUR);
    expect(seededHistory(arrivedItem(0, ANCHOR)).map((x) => x.kind)).toEqual(["received", "assigned"]);
  });

  it("shortens a ward name for its chip", () => {
    expect(wardShort("Ward 14 – Kalaivani Nagar")).toBe("Ward 14");
    expect(wardShort("வார்டு 14 – கலைவாணி நகர்")).toBe("வார்டு 14");
  });
});
