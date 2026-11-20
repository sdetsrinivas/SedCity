import { describe, expect, it } from "vitest";
import { dictionaries, translate, type DictKey } from "@/i18n";
import { feeSchedule, tradeFeeRange } from "./fees";

const tFor = (lang: "en" | "ta") => (k: DictKey, v?: Record<string, string | number>) => translate(dictionaries[lang], k, v);

describe("fee schedule", () => {
  it("is built from the services' own data", () => {
    const groups = feeSchedule(tFor("en"), "en");
    expect(groups.map((g) => g.id)).toEqual(["certificates", "venues", "online"]);
    const rows = groups.flatMap((g) => g.rows);
    expect(rows).toHaveLength(13);
    expect(rows.find((r) => r.service === "Birth certificate")).toMatchObject({ fee: "₹50.00", unit: "per copy" });
    expect(rows.find((r) => r.service === "Delivery by Speed Post")?.fee).toBe("₹40.00");
    expect(tradeFeeRange()).toEqual({ min: 500, max: 3000 });
    expect(rows.find((r) => r.service === "Trade licence")).toMatchObject({
      fee: "₹500.00 – ₹3,000.00",
      note: "By business category, plus ₹100.00 for every started 100 sq. ft above 200 sq. ft.",
    });
    expect(rows.find((r) => r.service === "Lake Road Kalyana Mandapam")).toMatchObject({
      fee: "₹900.00", unit: "per hour", note: "Plus a refundable deposit of ₹10,000.00 and any amenities chosen.",
    });
    expect(groups[2]!.rows.every((r) => r.fee === "Free")).toBe(true);
  });

  it("names the venues in Tamil for the Tamil page", () => {
    const venues = feeSchedule(tFor("ta"), "ta")[1]!.rows;
    expect(venues[0]!.service).toBe("கலைவாணி நகர் சமுதாயக் கூடம்");
    expect(venues[0]!.unit).toBe("மணிக்கு");
  });
});
