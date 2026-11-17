import { describe, expect, it } from "vitest";
import { validateRegistration } from "./registration";

const ok = { name: "Meena Rajendran", mobile: "9841023456", attendees: 2 };

describe("validateRegistration", () => {
  it("accepts a complete registration", () => {
    expect(validateRegistration(ok, 10)).toEqual({});
    expect(validateRegistration(ok, null)).toEqual({});
  });

  it("needs a name and a 10-digit mobile starting with 6–9", () => {
    expect(validateRegistration({ ...ok, name: " " }, 10)).toEqual({ name: "ev.errName" });
    expect(validateRegistration({ ...ok, mobile: "5841023456" }, 10)).toEqual({ mobile: "ev.errMobile" });
    expect(validateRegistration({ ...ok, mobile: "98410" }, 10)).toEqual({ mobile: "ev.errMobile" });
  });

  it("allows 1–4 people and no more than the seats left", () => {
    expect(validateRegistration({ ...ok, attendees: 0 }, 10)).toEqual({ attendees: "ev.errAttendees" });
    expect(validateRegistration({ ...ok, attendees: 5 }, 10)).toEqual({ attendees: "ev.errAttendees" });
    expect(validateRegistration({ ...ok, attendees: 2 }, 1)).toEqual({ attendees: "ev.errSeats" });
    expect(validateRegistration({ ...ok, attendees: 1 }, 1)).toEqual({});
  });
});
