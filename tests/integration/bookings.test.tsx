import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "./render";
import { BookingForm } from "@/modules/bookings/BookingForm";
import { firstAvailableDay, freeSlots, lastBookable, monthOf, slotLabel, venueById } from "@/modules/bookings/booking";
import { heldSlots } from "@/mock/endpoints/bookings";
import { listApplications } from "@/lib/applications";
import { listSms } from "@/lib/sms";
import { formatDate, todayISO } from "@/lib/format";
import type { Session } from "@/lib/session";

const session: Session = {
  username: "meena.r", name: "Meena Rajendran", nameTa: "மீனா", role: "citizen", astheenId: "x", mobile: "+91 98410 23456",
  email: "m@example.com", ward: "W14", loginAt: new Date().toISOString(), keepSignedIn: true,
};

/**
 * jsdom has no showModal()/close() and does not submit `<form method="dialog">`: a minimal stand-in
 * (the real behaviour is checked in the browser by the DLG-06 verification checks).
 */
beforeAll(() => {
  const proto = HTMLDialogElement.prototype as HTMLDialogElement & { __stub?: boolean };
  if (typeof proto.showModal === "function") return;
  proto.showModal = function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
  proto.close = function (this: HTMLDialogElement, rv?: string) {
    if (!this.hasAttribute("open")) return;
    if (rv !== undefined) this.returnValue = rv;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
  document.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest?.("button[type=submit]") as HTMLButtonElement | null;
    const dlg = b?.form?.getAttribute("method") === "dialog" ? b.closest("dialog") : null;
    if (b && dlg) { e.preventDefault(); dlg.close(b.value); }
  }, true);
});

const setMock =(o: object) => { document.cookie = `amc_mock=${encodeURIComponent(JSON.stringify({ scale: 0, ...o }))}; path=/`; };
const V01 = venueById("V01")!;

async function fillAll() {
  const today = todayISO();
  const day = firstAvailableDay(V01, today)!;
  const slot = freeSlots(V01, day)[0];
  fireEvent.change(screen.getByLabelText("Venue"), { target: { value: "V01" } });
  fireEvent.click(screen.getByRole("button", { name: "Booking date" }));
  const cal = screen.getByRole("dialog", { name: "Choose the booking date" });
  const label = new Date(`${day}T12:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  fireEvent.click(within(cal).getByRole("button", { name: label }));
  expect(screen.getByRole("button", { name: "Booking date" })).toHaveTextContent(formatDate(day));
  const rect = await screen.findByRole("checkbox", { name: `${slotLabel(slot)}, available` });
  fireEvent.click(rect);
  fireEvent.click(screen.getByText("Public address system"));
  fireEvent.change(screen.getByPlaceholderText("Purpose of the booking (e.g. wedding reception)"), { target: { value: "Family get-together" } });
  fireEvent.change(screen.getByPlaceholderText("Expected number of guests"), { target: { value: "120" } });
  return { day, slot };
}

/** Open the calendar for V01 with the clock set to `today` (local noon). */
function openCalendarOn(today: string) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${today}T12:00:00`));
  renderWithProviders(<BookingForm uid="t" session={session} />);
  fireEvent.change(screen.getByLabelText("Venue"), { target: { value: "V01" } });
  fireEvent.click(screen.getByRole("button", { name: "Booking date" }));
  return screen.getByRole("dialog", { name: "Choose the booking date" });
}

describe("Booking calendar month buttons", () => {
  afterEach(() => vi.useRealTimers());

  it("opens on the window's first month with Previous month disabled on an ordinary day", () => {
    const cal = openCalendarOn("2026-11-19");
    expect(within(cal).getByText("November 2026")).toBeInTheDocument();
    expect(within(cal).getByRole("button", { name: "Previous month" })).toBeDisabled();
    expect(within(cal).getByRole("button", { name: "Next month" })).toBeEnabled();
  });

  it("opens a month later, with Previous month enabled, when nothing is left to book in the first month", () => {
    // Today + 2 is 31/03/2026, a closed or fully booked day: the first available day is in April.
    const cal = openCalendarOn("2026-03-29");
    expect(within(cal).getByText("April 2026")).toBeInTheDocument();
    expect(within(cal).getByRole("button", { name: "Previous month" })).toBeEnabled();
    fireEvent.click(within(cal).getByRole("button", { name: "Previous month" }));
    expect(within(cal).getByText("March 2026")).toBeInTheDocument();
    expect(within(cal).getByRole("button", { name: "Previous month" })).toBeDisabled();
  });

  it("reaching the last month moves focus to Previous month, so Escape still closes the calendar", () => {
    const today = "2026-11-19";
    const cal = openCalendarOn(today);
    const next = within(cal).getByRole("button", { name: "Next month" });
    while (!(next as HTMLButtonElement).disabled) {
      next.focus();
      fireEvent.click(next);
    }
    expect(within(cal).getByText(new Date(`${monthOf(lastBookable(today))}-01T12:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" }))).toBeInTheDocument();
    expect(within(cal).getByRole("button", { name: "Previous month" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Choose the booking date" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Booking date" })).toHaveFocus();
  });
});

describe("Hall / park booking", () => {
  it("lists every problem with its limits filled in", () => {
    renderWithProviders(<BookingForm uid="t" session={session} />);
    fireEvent.change(screen.getByLabelText("Venue"), { target: { value: "V06" } });
    fireEvent.change(screen.getByPlaceholderText("Purpose of the booking (e.g. wedding reception)"), { target: { value: "ab" } });
    fireEvent.change(screen.getByPlaceholderText("Expected number of guests"), { target: { value: "500" } });
    fireEvent.click(screen.getByRole("button", { name: "Review and book" }));
    const summary = screen.getByText("Please correct the following:").closest<HTMLElement>("[role=alert]")!;
    expect(summary).toHaveTextContent("Choose the booking date.");
    expect(summary).toHaveTextContent("Enter the purpose of the booking (at least 5 characters).");
    expect(summary).toHaveTextContent("This venue can hold at most 80 guests.");
    expect(summary.textContent).not.toMatch(/\{\w+\}/);
  });

  it("books through the confirmation dialog and saves the record part B reads", async () => {
    renderWithProviders(<BookingForm uid="t" session={session} />);
    const { day, slot } = await fillAll();
    fireEvent.click(screen.getByRole("button", { name: "Review and book" }));
    const dialog = screen.getByRole("dialog", { name: "Confirm your booking" });
    expect(dialog).toHaveAttribute("open");
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm booking" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Booking confirmed" })).toBeInTheDocument());
    const [app] = listApplications();
    expect(app).toMatchObject({
      service: "booking", status: "Submitted", applicant: "Meena Rajendran", amount: 2 * 600 + 750 + 5000,
      details: { venue: "V01", date: day, slots: String(slot), amenities: "sound", purpose: "Family get-together", attendees: "120", mobile: "9841023456" },
    });
    expect(app.ref).toMatch(/^AMC\/BK\/\d{4}\/\d{6}$/);
    expect(heldSlots()).toEqual([{ venue: "V01", date: day, slots: [slot] }]);
    expect(listSms()[0].body).toContain(app.ref);
  });

  it("going back from the dialog books nothing", async () => {
    renderWithProviders(<BookingForm uid="t" session={session} />);
    await fillAll();
    fireEvent.click(screen.getByRole("button", { name: "Review and book" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Confirm your booking" })).getByRole("button", { name: "Go back" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Confirm your booking" })).not.toBeInTheDocument());
    expect(listApplications()).toHaveLength(0);
  });

  it("a failed booking shows an error and saves nothing", async () => {
    setMock({ fail: ["BOOKING_SUBMIT"] });
    renderWithProviders(<BookingForm uid="t" session={session} />);
    await fillAll();
    fireEvent.click(screen.getByRole("button", { name: "Review and book" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Confirm your booking" })).getByRole("button", { name: "Confirm booking" }));
    expect(await screen.findByText("The booking could not be completed. Please try again in a few minutes.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Booking confirmed" })).not.toBeInTheDocument();
    expect(listApplications()).toHaveLength(0);
  });

  it("when availability cannot be loaded there is no slot map, only an error with a retry", async () => {
    setMock({ fail: ["BOOKING_SLOTS"] });
    renderWithProviders(<BookingForm uid="t" session={session} />);
    const day = firstAvailableDay(V01, todayISO())!;
    fireEvent.change(screen.getByLabelText("Venue"), { target: { value: "V01" } });
    fireEvent.click(screen.getByRole("button", { name: "Booking date" }));
    const label = new Date(`${day}T12:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    fireEvent.click(screen.getByRole("button", { name: label }));
    expect(await screen.findByText("Availability could not be checked right now.")).toBeInTheDocument();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    setMock({});
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getAllByRole("checkbox").length).toBe(8));
    expect(screen.queryByText("Availability could not be checked right now.")).not.toBeInTheDocument();
  });
});
