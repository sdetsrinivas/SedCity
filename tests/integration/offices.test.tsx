import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "./render";
import { officeById } from "@/mock/endpoints/directory";
import { OfficeFinder } from "@/modules/directory/OfficeFinder";

const failNext = (name: string) => {
  document.cookie = `amc_mock=${encodeURIComponent(JSON.stringify({ scale: 0, fail: [name] }))}; path=/`;
};

type Geo = Partial<Geolocation>;
function mockGeolocation(impl: Geo["getCurrentPosition"]) {
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: impl } });
}
const at = (lat: number, lng: number): Geo["getCurrentPosition"] => (ok) => ok({ coords: { latitude: lat, longitude: lng } } as GeolocationPosition);
const refuse = (code: number): Geo["getCurrentPosition"] => (_ok, err) =>
  err?.({ code, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: "" } as GeolocationPositionError);

const details = () => screen.getByRole("region", { name: "Office details" });
const listbox = () => screen.findByRole("listbox", { name: "Offices" });

afterEach(() => {
  delete (navigator as { geolocation?: unknown }).geolocation;
});

describe("Find nearest office", () => {
  it("starts with the head office chosen and every office listed", async () => {
    renderWithProviders(<OfficeFinder />);
    expect(screen.getByText("Showing 103 of 103 offices")).toBeInTheDocument();
    expect(within(details()).getByRole("heading", { name: "Corporation Head Office" })).toBeInTheDocument();
    expect(details()).toHaveTextContent("Ripon Mahal, Kalaivani SquareAstheenapuram – 600901");
    const box = await listbox();
    const first = within(box).getAllByRole("option")[0];
    expect(first).toHaveTextContent("Corporation Head Office");
    expect(first).toHaveAttribute("aria-selected", "true");
    expect(first).toHaveAttribute("aria-setsize", "103");
  });

  it("filters by type and text, and chooses an office by keyboard", async () => {
    renderWithProviders(<OfficeFinder />);
    const box = await listbox();
    fireEvent.change(screen.getByLabelText("Type of office"), { target: { value: "zone" } });
    expect(screen.getByText("Showing 6 of 103 offices")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Office name, area or PIN code"), { target: { value: "marudham" } });
    expect(screen.getByText("Showing 1 of 103 offices")).toBeInTheDocument();
    fireEvent.focus(box);
    fireEvent.keyDown(box, { key: "Enter" });
    expect(within(details()).getByRole("heading", { name: "Zone Office – Marudham" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Office name, area or PIN code"), { target: { value: "zzzz" } });
    expect(screen.getByText("No office matches your search.")).toBeVisible();
  });

  it("names the nearest office once the browser shares the position", async () => {
    const csc = officeById("CSC-05")!;
    mockGeolocation(at(csc.lat + 0.001, csc.lng));
    renderWithProviders(<OfficeFinder />);
    fireEvent.click(screen.getByRole("button", { name: "Use my current location" }));
    await screen.findByText(`Nearest office: ${csc.name.en}, 0.1 km from your location.`);
    expect(within(details()).getByRole("heading", { name: csc.name.en })).toBeInTheDocument();
    expect(within(details()).getByText("0.1 km from your location")).toBeInTheDocument();
    expect(within(await listbox()).getAllByRole("option")[0]).toHaveTextContent(`${csc.name.en}`);
    expect(screen.queryByText(/outside the Corporation limits/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Clear location" }));
    expect(screen.queryByText(/^Nearest office:/)).toBeNull();
    expect(within(await listbox()).getAllByRole("option")[0]).toHaveTextContent("Corporation Head Office");
  });

  it("drops the earlier location when a later attempt fails", async () => {
    const csc = officeById("CSC-05")!;
    mockGeolocation(at(csc.lat + 0.001, csc.lng));
    renderWithProviders(<OfficeFinder />);
    fireEvent.click(screen.getByRole("button", { name: "Use my current location" }));
    await screen.findByText(`Nearest office: ${csc.name.en}, 0.1 km from your location.`);
    expect(within(await listbox()).getAllByRole("option")[0]).toHaveTextContent("0.1 km");

    mockGeolocation(refuse(3));
    fireEvent.click(screen.getByRole("button", { name: "Use my current location" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Your location could not be found.");
    expect(screen.queryByText(/km from your location/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Clear location" })).toBeNull();
    const first = within(await listbox()).getAllByRole("option")[0];
    expect(first).toHaveTextContent("Corporation Head Office");
    expect(first).not.toHaveTextContent("km");
    // The office chosen by the earlier attempt stays chosen.
    expect(within(details()).getByRole("heading", { name: csc.name.en })).toBeInTheDocument();
  });

  it("says so when the position is outside the city", async () => {
    mockGeolocation(at(13.0827, 80.2707));
    renderWithProviders(<OfficeFinder />);
    fireEvent.click(screen.getByRole("button", { name: "Use my current location" }));
    expect(await screen.findByText(/^Your location is about [\d,.]+ km from the city centre, outside the Corporation limits/)).toBeInTheDocument();
    expect(screen.getByText(/^Nearest office: /)).toBeInTheDocument();
  });

  it.each([
    [1, "Location access is turned off for this site."],
    [3, "Your location could not be found."],
  ])("shows an error when the browser refuses (code %i)", async (code, text) => {
    mockGeolocation(refuse(code));
    renderWithProviders(<OfficeFinder />);
    fireEvent.click(screen.getByRole("button", { name: "Use my current location" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(text);
    expect(screen.queryByText(/^Nearest office:/)).toBeNull();
    expect(within(details()).getByRole("heading", { name: "Corporation Head Office" })).toBeInTheDocument();
  });

  it("shows an error when the offices near the position cannot be found", async () => {
    failNext("OFFICE_NEAREST");
    mockGeolocation(at(12.5, 79.5));
    renderWithProviders(<OfficeFinder />);
    fireEvent.click(screen.getByRole("button", { name: "Use my current location" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Offices near you could not be found right now.");
    expect(screen.queryByText(/^Nearest office:/)).toBeNull();
  });

  it("inserts the map frame only after loading, without id or name; a failure offers Try again", async () => {
    failNext("MAP_IFRAME");
    const { container } = renderWithProviders(<OfficeFinder />);
    expect(screen.getByText("Loading map…")).toBeInTheDocument();
    expect(container.querySelector("iframe")).toBeNull();
    expect(await screen.findByText("The map could not be loaded right now.")).toBeInTheDocument();
    document.cookie = `amc_mock=${encodeURIComponent(JSON.stringify({ scale: 0 }))}; path=/`;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(container.querySelector("iframe")).not.toBeNull());
    const frame = container.querySelector("iframe")!;
    expect(frame).toHaveAttribute("title", "Map of Corporation offices");
    expect(frame.hasAttribute("id") || frame.hasAttribute("name")).toBe(false);
    vi.restoreAllMocks();
  });
});
