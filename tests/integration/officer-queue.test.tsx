import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "./render";
import { OfficerQueue } from "@/modules/officer/OfficerQueue";
import type { Session } from "@/lib/session";
import { store } from "@/mock/store";
import { seededItems, sortBySla } from "@/modules/officer/queue";

const officer: Session = {
  username: "officer.selvi", name: "Selvi Natarajan", nameTa: "செல்வி நடராஜன்", role: "officer", astheenId: "ASP-7710-2209-2",
  mobile: "9445566778", email: "selvi.n@amc.example", ward: "Zone II – Revenue Office", loginAt: new Date().toISOString(), keepSignedIn: true,
};
/** No automatic refreshes unless a test asks for them (scale 0 would make the poll run every 200ms). */
const setMock = (o: { delays?: Record<string, number> } = {}) => {
  document.cookie = `amc_mock=${encodeURIComponent(JSON.stringify({ scale: 0, delays: { TOAST_TTL: 3000, QUEUE_POLL: 600_000, ...o.delays } }))}; path=/`;
};

async function renderQueue(session: Session = officer) {
  setMock();
  store.set("session", session);
  renderWithProviders(<OfficerQueue />);
  const table = await screen.findByRole("table", { name: "Open grievances, the most urgent first" });
  return table;
}
const row = (table: HTMLElement, no: string) => within(table).getByRole("rowheader", { name: new RegExp(`^AMC/GR/\\d{4}/00${no}$`) }).closest("tr")!;

describe("Officer work queue", () => {
  it("is for officers only", async () => {
    setMock();
    store.set("session", { ...officer, username: "meena.r", role: "citizen" });
    renderWithProviders(<OfficerQueue />);
    expect(await screen.findByText("This page is available to AMC officers only.")).toBeInTheDocument();
  });

  it("lists the zone's grievances in SLA order, with colleagues' claims and the officer's own", async () => {
    const table = await renderQueue();
    const anchor = store.get<number>("queueAnchor", 0, "session");
    const expected = sortBySla(seededItems(anchor)).map((i) => i.ref);
    expect(within(table).getAllByRole("rowheader").map((h) => h.textContent)).toEqual(expected);
    expect(within(row(table, "4719")).getByText("K. Ravi")).toBeInTheDocument();
    expect(within(row(table, "4730")).getByText("You")).toBeInTheDocument();
    expect(within(row(table, "4702")).getByText(/^Overdue by /)).toBeInTheDocument();
    expect(screen.getByText("Showing 14 of 14 open grievances")).toBeInTheDocument();
  });

  it("filters by the chosen wards (chips) and remembers them", async () => {
    const table = await renderQueue();
    const box = screen.getByRole("combobox", { name: "Wards" });
    fireEvent.focus(box);
    const list = screen.getByRole("listbox");
    expect(list).toHaveAttribute("aria-multiselectable", "true");
    fireEvent.click(within(list).getByRole("option", { name: /Ward 14 – Kalaivani Nagar/ }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(within(list).getByRole("option", { name: /Ward 14 – Kalaivani Nagar/ })).toHaveAttribute("aria-selected", "true");
    expect(within(table).getAllByRole("rowheader")).toHaveLength(2);
    expect(within(screen.getByRole("list", { name: "Selected wards" })).getByText("Ward 14")).toBeInTheDocument();
    expect(store.get("queueWards", {})).toEqual({ "officer.selvi": ["W14"] });
    fireEvent.keyDown(box, { key: "Backspace" });
    expect(within(table).getAllByRole("rowheader")).toHaveLength(14);
  });

  it("claims on a double-click only", async () => {
    const table = await renderQueue();
    const claim = within(row(table, "4711")).getByRole("button", { name: "Claim" });
    fireEvent.click(claim);
    fireEvent.keyDown(claim, { key: "Enter" });
    expect(store.get("queueClaims", null)).toBeNull();
    fireEvent.doubleClick(claim);
    await waitFor(() => expect(within(row(table, "4711")).getByRole("button", { name: "Release" })).toBeInTheDocument());
    expect(Object.values(store.get<Record<string, { by: string }>>("queueClaims", {}))[0].by).toBe("officer.selvi");
  });

  it("bulk claim pushes one toast per grievance and a summary; failures stay", async () => {
    const table = await renderQueue();
    for (const no of ["4711", "4719", "4730"]) fireEvent.click(within(row(table, no)).getByRole("checkbox"));
    expect(screen.getByText("3 selected")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Claim selected" }));
    await screen.findByText(/Claimed 1 of 3 selected grievances\./);
    expect(screen.getByRole("alert")).toHaveTextContent(/004719 is already claimed by K\. Ravi\./);
    expect(screen.getByText(/004711 claimed\./)).toBeInTheDocument();
    expect(screen.getByText(/004730 is already yours\./)).toBeInTheDocument();
    expect(screen.getByText("0 selected")).toBeInTheDocument();
  });

  it("expands a row into a details row with the history", async () => {
    const table = await renderQueue();
    const toggle = within(row(table, "4730")).getByRole("button", { name: "Show details" });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const detail = document.getElementById(toggle.getAttribute("aria-controls")!)!;
    expect(detail.tagName).toBe("TR");
    await waitFor(() => expect(within(detail).getByText("Claimed by Selvi Natarajan")).toBeInTheDocument());
    expect(within(detail).getByText(/Road cut for the cable work/)).toBeInTheDocument();
    fireEvent.click(within(row(table, "4730")).getByRole("button", { name: "Hide details" }));
    expect(detail).not.toBeInTheDocument();
  });
});
