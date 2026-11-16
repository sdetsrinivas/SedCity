import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { registry } from "./registry";
import { CATEGORY_PREFIX } from "./types";
import { DELAYS } from "../src/mock/delays";

const root = path.resolve(__dirname, "..");
const specDir = path.join(root, "verification");
const specText = fs.readdirSync(specDir).filter((f) => f.endsWith(".spec.ts")).map((f) => fs.readFileSync(path.join(specDir, f), "utf8")).join("\n");

describe("trap registry", () => {
  it("ids are unique and well-formed", () => {
    const ids = registry.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^(CHK|RAD|TXT|DRP|BTN|DLG|FRM|SHD|HYD|DYN|TBL|DAT|FIL|OTH)-\d{2}$/);
  });

  it.each(registry.map((t) => [t.id, t] as const))("%s is complete and consistent", (id, t) => {
    expect(t.category).toBe(CATEGORY_PREFIX[id.slice(0, 3)]);
    for (const k of ["title", "route", "flow", "description", "implementation", "whyHard", "selenium", "playwright", "assert"] as const) {
      expect(t[k].trim().length, `${id}.${k}`).toBeGreaterThan(k === "route" ? 0 : 3);
    }
    expect(t.files.length, `${id} has files`).toBeGreaterThan(0);
    const marked = t.files.some((f) => fs.readFileSync(path.join(root, f), "utf8").includes(id));
    expect(marked, `${id} trap comment present in one of ${t.files.join(", ")}`).toBe(true);
    for (const d of t.delays) expect(DELAYS, `${id} delay ${d}`).toHaveProperty(d);
  });

  it.each(registry.map((t) => t.id))("%s has at least one verification check", (id) => {
    expect(specText.includes(`[${id}]`), `verification/*.spec.ts must contain a test titled with [${id}]`).toBe(true);
  });

  it("every delay that names a trap points at a registered trap", () => {
    const ids = new Set(registry.map((t) => t.id));
    for (const [name, d] of Object.entries(DELAYS)) for (const id of d.traps) expect(ids.has(id), `${name} → ${id}`).toBe(true);
  });
});
