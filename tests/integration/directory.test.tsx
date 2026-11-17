import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "./render";
import { DEFAULT_QUERY, queryOfficials } from "@/mock/endpoints/directory";
import { OfficialsDirectory } from "@/modules/directory/OfficialsDirectory";

const render = (lang: "en" | "ta" = "en") => renderWithProviders(<OfficialsDirectory initial={queryOfficials(DEFAULT_QUERY, lang)} />, lang);
const bodyRows = () => within(screen.getByRole("table")).getAllByRole("row").slice(1);
const rowOf = (name: string) => screen.getByRole("rowheader", { name }).closest("tr")!;
const failNext = (name: string) => {
  document.cookie = `amc_mock=${encodeURIComponent(JSON.stringify({ scale: 0, fail: [name] }))}; path=/`;
};

describe("Officials directory", () => {
  it("shows the first ten officials with a range and a pager", () => {
    render();
    expect(bodyRows()).toHaveLength(10);
    expect(screen.getByText("Showing 1–10 of 61 officials")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  });

  it("chooses a department by typing and Enter; unchosen text is discarded on blur", async () => {
    render();
    const combo = screen.getByRole("combobox", { name: "Department" });
    fireEvent.change(combo, { target: { value: "eng" } });
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Engineering (Roads and Buildings)"]);
    fireEvent.keyDown(combo, { key: "Enter" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(combo).toHaveValue("Engineering (Roads and Buildings)");
    await screen.findByText("Showing 1–8 of 8 officials");
    expect(window.location.search).toBe("?department=engineering");

    fireEvent.change(combo, { target: { value: "health" } });
    expect(screen.getByRole("option", { name: "Public Health" })).toBeInTheDocument();
    fireEvent.blur(combo);
    expect(combo).toHaveValue("Engineering (Roads and Buildings)");
    expect(screen.getByText("Showing 1–8 of 8 officials")).toBeInTheDocument();

    fireEvent.change(combo, { target: { value: "xyz" } });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByText("No department matches “xyz”.")).toBeInTheDocument();
    fireEvent.keyDown(combo, { key: "Escape" });
    expect(combo).toHaveValue("Engineering (Roads and Buildings)");

    fireEvent.keyDown(combo, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")).toHaveLength(14);
    expect(document.getElementById(combo.getAttribute("aria-activedescendant")!)).toHaveTextContent("Engineering");
    fireEvent.click(screen.getByRole("option", { name: "All departments" }));
    await screen.findByText("Showing 1–10 of 61 officials");
    window.history.replaceState(null, "", "/");
  });

  it("sorts by a column, then reverses; rows are moved, not replaced", async () => {
    render();
    const nameHeader = screen.getByRole("columnheader", { name: "Name" });
    expect(nameHeader).not.toHaveAttribute("aria-sort");
    const deepa = rowOf("A. Deepa");
    fireEvent.click(within(nameHeader).getByRole("button"));
    await waitFor(() => expect(nameHeader).toHaveAttribute("aria-sort", "ascending"));
    expect(bodyRows()[0]).toHaveTextContent("A. Deepa");
    expect(deepa.isConnected).toBe(true);
    expect(rowOf("A. Deepa")).toBe(deepa);
    fireEvent.click(within(nameHeader).getByRole("button"));
    await waitFor(() => expect(nameHeader).toHaveAttribute("aria-sort", "descending"));
    expect(deepa.isConnected).toBe(false);
  });

  it("replaces every row after a filter, even an official who is still listed", async () => {
    render();
    const chief = () => rowOf("G. Dinesh");
    fireEvent.change(screen.getByRole("combobox", { name: "Department" }), { target: { value: "engin" } });
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Department" }), { key: "Enter" });
    await screen.findByText("Showing 1–8 of 8 officials");
    const before = chief();
    fireEvent.change(screen.getByLabelText("Name or designation"), { target: { value: "engineer" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => expect(before.isConnected).toBe(false));
    expect(chief()).toHaveTextContent("Chief Engineer");
    expect(screen.getByText("Showing 1–8 of 8 officials")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await screen.findByText("Showing 1–10 of 61 officials");
    window.history.replaceState(null, "", "/");
  });

  it("pages forward and to a numbered page", async () => {
    render();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Showing 11–20 of 61 officials");
    fireEvent.click(screen.getByRole("button", { name: "Page 7" }));
    await screen.findByText("Showing 61–61 of 61 officials");
    expect(bodyRows()).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("row actions are icon-only and named by aria-label; View details opens that official", () => {
    render();
    const row = rowOf("V. Kavitha");
    const view = within(row).getByRole("button", { name: "View details of V. Kavitha" });
    expect(view).toHaveTextContent("");
    expect(view).not.toHaveAttribute("title");
    expect(within(row).getByRole("link", { name: "Call V. Kavitha" })).toHaveAttribute("href", "tel:1552026,202");
    expect(within(row).getByRole("link", { name: "Email V. Kavitha" })).toHaveAttribute("href", "mailto:kavitha.v@amc.example");
    fireEvent.click(view);
    const dialog = screen.getByRole("dialog", { name: "V. Kavitha" });
    expect(dialog).toHaveTextContent("Additional Commissioner");
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows an error with retry when a page cannot be loaded", async () => {
    render();
    failNext("DIRECTORY_PAGE");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The directory could not be loaded right now.");
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByText(/^Showing/)).toBeNull();
    document.cookie = `amc_mock=${encodeURIComponent(JSON.stringify({ scale: 0 }))}; path=/`;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByText("Showing 11–20 of 61 officials");
  });

  it("downloads every matching official as CSV, and reports a failure", async () => {
    const blobs: Blob[] = [];
    const created = vi.fn((b: Blob) => (blobs.push(b), "blob:x"));
    Object.assign(URL, { createObjectURL: created, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe("amc-officials-all.csv");
    });
    render();
    fireEvent.click(screen.getByRole("button", { name: "Download list (CSV)" }));
    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    const text = await blobs[0].text();
    const lines = text.replace(/^﻿/, "").trimEnd().split("\r\n");
    expect(lines).toHaveLength(62);
    expect(lines[0]).toBe("Name,Designation,Department,Office,Phone,Email");
    expect(lines).toContain('L. Murugan,"Deputy Commissioner (Revenue, Finance)",Commissioner\'s Office,Corporation Head Office,155 2026 Ext. 203,murugan.l@amc.example');

    failNext("DIRECTORY_EXPORT");
    fireEvent.click(screen.getByRole("button", { name: "Download list (CSV)" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The file could not be prepared. Please try again.");
    expect(click).toHaveBeenCalledTimes(1);
    click.mockRestore();
  });

  it("renders in Tamil", () => {
    render("ta");
    expect(screen.getByText("61 அலுவலர்களில் 1–10 காட்டப்படுகிறது")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "வெ. கவிதா – விவரங்களைக் காண்க" })).toBeInTheDocument();
  });
});
