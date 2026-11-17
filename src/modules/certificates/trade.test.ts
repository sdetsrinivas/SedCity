import { describe, expect, it } from "vitest";
import { TRADE_GROUPS, tradeFee } from "@/mock/endpoints/certificates";
import { EMPTY_TRADE, checkDocuments, maskAccount, strokeLength, validateTrade, type TradeDraft } from "./trade";

const valid: TradeDraft = {
  businessName: "Sri Murugan Sweets", category: "FH02", area: "450",
  premises: { line: "14, Thendral Street, Kalaivani Nagar", pin: "641014" }, ward: "W14", ownership: "rented",
  ownerName: "Murugan Selvam", mobile: "9840012345", email: "",
  residence: { line: "7, Lake Road, Pavala Nagar", pin: "641022" },
  holder: "Murugan Selvam", account: "123456789012", account2: "123456789012", ifsc: "ASTB0001234", declared: true,
};
const ok = { documents: 2, signature: 120 };

describe("validateTrade", () => {
  it("accepts a complete application (email is optional)", () => {
    expect(validateTrade(valid, ok)).toEqual({});
  });

  it("reports every missing field of an empty form", () => {
    expect(Object.keys(validateTrade(EMPTY_TRADE, { documents: 0, signature: 0 }))).toEqual([
      "businessName", "category", "area", "premisesLine", "premisesPin", "ward", "ownership", "ownerName", "mobile",
      "residenceLine", "residencePin", "documents", "holder", "account", "account2", "ifsc", "signature", "declared",
    ]);
  });

  it("checks the two addresses separately", () => {
    const e = validateTrade({ ...valid, residence: { line: "", pin: "12" } }, ok);
    expect(e).toEqual({ residenceLine: "tl.errResidenceLine", residencePin: "tl.errResidencePin" });
  });

  it("requires the re-entered account number to match", () => {
    expect(validateTrade({ ...valid, account2: "123456789000" }, ok)).toEqual({ account2: "tl.errAccountMismatch" });
    expect(validateTrade({ ...valid, account2: "" }, ok)).toEqual({ account2: "tl.errAccount2" });
    expect(validateTrade({ ...valid, account: "1234", account2: "1234" }, ok)).toEqual({ account: "tl.errAccount" });
  });

  it("rejects areas outside whole numbers from 20 to 20000 sq. ft", () => {
    for (const area of ["", "19", "20001", "12.5", "abc"]) expect(validateTrade({ ...valid, area }, ok).area).toBe("tl.errArea");
    for (const area of ["20", "20000"]) expect(validateTrade({ ...valid, area }, ok).area).toBeUndefined();
  });

  it("tells an empty signature from one that is too short", () => {
    expect(validateTrade(valid, { ...ok, signature: 0 }).signature).toBe("tl.errSignature");
    expect(validateTrade(valid, { ...ok, signature: 30 }).signature).toBe("tl.errSignatureShort");
    expect(validateTrade(valid, { ...ok, signature: 60 }).signature).toBeUndefined();
  });

  it("checks the IFSC format, the email when given and the number of documents", () => {
    expect(validateTrade({ ...valid, ifsc: "ASTB1001234" }, ok).ifsc).toBe("tl.errIfsc");
    expect(validateTrade({ ...valid, email: "murugan@" }, ok).email).toBe("tl.errEmail");
    expect(validateTrade(valid, { ...ok, documents: 1 }).documents).toBe("tl.errDocuments");
  });
});

describe("checkDocuments", () => {
  const f = (name: string, type = "application/pdf", size = 1000) => ({ name, type, size });
  it("accepts up to five PDFs or images of at most 2 MB", () => {
    expect(checkDocuments([f("a.pdf"), f("b.jpg", "image/jpeg"), f("c.png", "image/png")])).toEqual([]);
  });
  it("names each unusable file", () => {
    expect(checkDocuments([f("a.pdf"), f("notes.txt", "text/plain"), f("big.pdf", "application/pdf", 3 * 1024 * 1024)])).toEqual([
      { key: "tl.errDocType", name: "notes.txt" },
      { key: "tl.errDocSize", name: "big.pdf" },
    ]);
  });
  it("refuses more than five files", () => {
    expect(checkDocuments(Array.from({ length: 6 }, (_, i) => f(`${i}.pdf`)))).toEqual([{ key: "tl.errDocumentsMany" }]);
  });
});

describe("tradeFee", () => {
  it("adds ₹100 per started 100 sq. ft above 200 sq. ft", () => {
    expect(tradeFee("FH02", 150)).toBe(1500);
    expect(tradeFee("FH02", 200)).toBe(1500);
    expect(tradeFee("FH02", 201)).toBe(1600);
    expect(tradeFee("FH02", 450)).toBe(1800);
    expect(tradeFee("RT01", 550)).toBe(1600);
  });
  it("is null for an unknown category or a non-positive area", () => {
    expect(tradeFee("XX01", 100)).toBeNull();
    expect(tradeFee("FH02", 0)).toBeNull();
  });
  it("has unique category codes and an 'Others' in every group", () => {
    const ids = TRADE_GROUPS.flatMap((g) => g.categories.map((c) => c.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const g of TRADE_GROUPS) expect(g.categories.at(-1)!.en).toBe("Others");
  });
});

describe("helpers", () => {
  it("masks all but the last four digits", () => {
    expect(maskAccount("123456789012")).toBe("XXXXXXXX9012");
    expect(maskAccount("1234")).toBe("1234");
  });
  it("adds up stroke lengths", () => {
    expect(strokeLength([[{ x: 0, y: 0 }, { x: 3, y: 4 }], [{ x: 10, y: 10 }], [{ x: 0, y: 0 }, { x: 0, y: 10 }]])).toBe(15);
    expect(strokeLength([])).toBe(0);
  });
});
