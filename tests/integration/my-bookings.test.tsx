import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "./render";
import { MyBookings } from "@/modules/bookings/MyBookings";
import { listApplications } from "@/lib/applications";
import { listSms } from "@/lib/sms";
import { formatDate, todayISO } from "@/lib/format";
import { hhmm } from "@/modules/bookings/booking";
import type { Session } from "@/lib/session";
import { moveCase } from "../../verification/booking-moves";

const session: Session = {
  username: "meena.r", name: "Meena Rajendran", nameTa: "மீனா", role: "citizen", astheenId: "x", mobile: "9841023456",
  email: "m@example.com", ward: "W14", loginAt: new Date().toISOString(), keepSignedIn: true,
};
const setMock = (o: object) => { document.cookie = `amc_mock=${encodeURIComponent(JSON.stringify({ scale: 0, ...o }))}; path=/`; };

/** A data transfer good enough for React's drag handlers in jsdom. */
function transfer() {
  const data = new Map<string, string>();
  return { data, dropEffect: "none", effectAllowed: "all", setData: (k: string, v: string) => data.set(k, v), getData: (k: string) => data.get(k) ?? "", types: [] as string[] };
}

/** The board cell for a day and a start hour: row by its time header, column by the day's position. */
function cell(board: HTMLElement, monday: string, date: string, hour: number) {
  const row = within(board).getByRole("rowheader", { name: new RegExp(`^${hhmm(hour)} – `) }).closest("tr")!;
  const col = (new Date(`${date}T12:00:00`).getTime() - new Date(`${monday}T12:00:00`).getTime()) / 86_400_000;
  return row.querySelectorAll("td")[Math.round(col)] as HTMLElement;
}

async function openBoard() {
  renderWithProviders(<MyBookings session={session} version={0} onMoved={() => {}} />);
  const c = moveCase(todayISO());
  const table = await screen.findByRole("table");
  const row = within(table).getByRole("rowheader", { name: c.booking.ref }).closest("tr")!;
  fireEvent.click(within(row).getByRole("button", { name: "Move" }));
  const board = await screen.findByRole("region", { name: `Availability for the week of ${formatDate(c.monday)}` });
  return { c, board };
}

describe("My bookings", () => {
  it("lists the citizen's bookings, with rows of the same venue, date and time told apart by number", async () => {
    renderWithProviders(<MyBookings session={session} version={0} onMoved={() => {}} />);
    const c = moveCase(todayISO());
    const table = await screen.findByRole("table");
    const heads = within(table).getAllByRole("rowheader").map((h) => h.textContent);
    expect(heads).toEqual(c.mine.map((a) => a.ref));
    const rows = within(table).getAllByRole("row").slice(1);
    const sameText = rows.filter((r) => r.textContent!.includes(formatDate(c.booking.details.date)) && r.textContent!.includes("Lake Road Kalyana Mandapam"));
    expect(sameText).toHaveLength(2);
    // The lapsed one has no Move button; four rows do, all named alike.
    expect(within(table).getAllByRole("button", { name: "Move" })).toHaveLength(4);
    expect(within(sameText[0]).getByText("Lapsed")).toBeInTheDocument();
  });

  it("a drop with the booking's number rewrites the same record and confirms by SMS", async () => {
    const { c, board } = await openBoard();
    const chip = screen.getByRole("button", { name: new RegExp(c.booking.ref.replace(/\//g, "\\/")) });
    const dt = transfer();
    fireEvent.dragStart(chip, { dataTransfer: dt });
    expect(dt.data.get("text/plain")).toBe(c.booking.ref);
    const t = c.target!;
    fireEvent.drop(cell(board, c.monday, t.date, t.hour), { dataTransfer: dt });
    const time = `${hhmm(t.hour)} – ${hhmm(t.hour + 4)}`;
    expect(await screen.findByText(`Booking ${c.booking.ref} has been moved to ${formatDate(t.date)}, ${time}.`)).toBeInTheDocument();
    const saved = listApplications().find((a) => a.ref === c.booking.ref)!;
    expect(saved.details).toMatchObject({ date: t.date, slots: `${t.hour},${t.hour + 2}`, start: hhmm(t.hour), end: hhmm(t.hour + 4), hours: "4" });
    expect(saved.amount).toBe(c.booking.amount);
    expect(listApplications()).toHaveLength(1);
    expect(listSms()[0].body).toContain(c.booking.ref);
  });

  it("a drop on a booked slot, or without the booking's number, changes nothing", async () => {
    const { c, board } = await openBoard();
    const taken = c.taken!;
    fireEvent.drop(cell(board, c.monday, taken.date, taken.hour), { dataTransfer: transfer() });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    const dt = transfer();
    dt.setData("text/plain", c.booking.ref);
    fireEvent.drop(cell(board, c.monday, taken.date, taken.hour), { dataTransfer: dt });
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(`${formatDate(taken.date)}, ${hhmm(taken.hour)} – ${hhmm(taken.hour + 4)} is not free. Your booking has not been moved.`);
    expect(listApplications()).toHaveLength(0);
  });

  it("a failed move shows an error and keeps the booking where it was", async () => {
    setMock({ fail: ["BOOKING_MOVE"] });
    const { c, board } = await openBoard();
    const dt = transfer();
    dt.setData("text/plain", c.booking.ref);
    fireEvent.drop(cell(board, c.monday, c.target!.date, c.target!.hour), { dataTransfer: dt });
    expect(await screen.findByText("Your booking could not be moved right now. Please try again in a few minutes.")).toBeInTheDocument();
    expect(listApplications()).toHaveLength(0);
    expect(screen.queryByText(/has been moved/)).not.toBeInTheDocument();
    await waitFor(() => expect(cell(board, c.monday, c.booking.details.date, Number(c.booking.details.slots.split(",")[0]))).toHaveTextContent("Your booking"));
  });

  it("keyboard: Space picks the booking up, arrows choose, Space moves it", async () => {
    const { c } = await openBoard();
    const chip = screen.getByRole("button", { name: new RegExp(c.booking.ref.replace(/\//g, "\\/")) });
    await waitFor(() => expect(chip).toHaveFocus());
    fireEvent.keyDown(chip, { key: " " });
    expect(chip).toHaveAttribute("aria-pressed", "true");
    const t = c.target!;
    const from = { date: c.booking.details.date, hour: Number(c.booking.details.slots.split(",")[0]) };
    const days = Math.round((new Date(`${t.date}T12:00:00`).getTime() - new Date(`${from.date}T12:00:00`).getTime()) / 86_400_000);
    for (let i = 0; i < Math.abs(days); i++) fireEvent.keyDown(chip, { key: days < 0 ? "ArrowLeft" : "ArrowRight" });
    const steps = (t.hour - from.hour) / 2;
    for (let i = 0; i < Math.abs(steps); i++) fireEvent.keyDown(chip, { key: steps < 0 ? "ArrowUp" : "ArrowDown" });
    expect(screen.getByText(new RegExp(`^${formatDate(t.date)}, ${hhmm(t.hour)} – .*: free$`))).toBeInTheDocument();
    fireEvent.keyDown(chip, { key: " " });
    await waitFor(() => expect(listApplications().find((a) => a.ref === c.booking.ref)?.details.date).toBe(t.date));
  });
});
