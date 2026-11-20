import { beforeAll, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "./render";
import { Dashboard } from "@/modules/dashboard/Dashboard";
import { ContactForm } from "@/modules/dashboard/ContactForm";
import type { Session } from "@/lib/session";
import { store } from "@/mock/store";

const session: Session = {
  username: "meena.r", name: "Meena Rajendran", nameTa: "மீனா", role: "citizen", astheenId: "ASP-4821-7730-6", mobile: "9841023456",
  email: "meena.r@mail.example", ward: "Ward 14", loginAt: new Date().toISOString(), keepSignedIn: true,
};
const setMock = (o: object) => { document.cookie = `amc_mock=${encodeURIComponent(JSON.stringify({ scale: 0, ...o }))}; path=/`; };

beforeAll(() => {
  // jsdom has no ResizeObserver (the charts measure their width with it).
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
});

async function renderBoard() {
  store.set("session", session);
  renderWithProviders(<Dashboard />);
  const card = (await screen.findByRole("heading", { name: "Notifications" })).closest("section")!;
  await waitFor(() => expect(within(card).getAllByRole("checkbox")).toHaveLength(7));
  return card;
}

describe("Citizen dashboard", () => {
  it("shows placeholder rows while loading, then the cards", async () => {
    setMock({ delays: { SKELETON: 200 } });
    store.set("session", session);
    renderWithProviders(<Dashboard />);
    const card = (await screen.findByRole("heading", { name: "Notifications" })).closest("section")!;
    expect(card.querySelector("[aria-busy=true]")).not.toBeNull();
    expect(card.querySelectorAll("li")).toHaveLength(4);
    expect(within(card).queryByText(/water bill/)).toBeNull();
    await waitFor(() => expect(card.querySelector("[aria-busy=true]")).toBeNull());
    expect(card.querySelectorAll("li")).toHaveLength(6);
    expect(within(card).getByText("3 unread")).toBeInTheDocument();
  });

  it("select all is indeterminate (property only) when some notifications are selected", async () => {
    const card = await renderBoard();
    const all = within(card).getByLabelText("Select all") as HTMLInputElement;
    fireEvent.click(within(card).getByLabelText(/site inspection/));
    expect(all.indeterminate).toBe(true);
    expect(all.checked).toBe(false);
    expect(all.hasAttribute("indeterminate")).toBe(false);
    fireEvent.click(all);
    expect(all.indeterminate).toBe(false);
    expect(all.checked).toBe(true);
    fireEvent.click(all);
    expect(within(card).getAllByRole("checkbox").filter((c) => (c as HTMLInputElement).checked)).toHaveLength(0);
  });

  it("delete can be undone; otherwise it is saved when the snackbar closes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const card = await renderBoard();
      fireEvent.click(within(card).getByLabelText(/site inspection/));
      fireEvent.click(within(card).getByRole("button", { name: "Delete" }));
      expect(within(card).queryByText(/site inspection/)).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Undo" }));
      expect(within(card).getByText(/site inspection/)).toBeInTheDocument();
      expect(store.get("dashNotices", {})).toEqual({});

      fireEvent.click(within(card).getByLabelText(/site inspection/));
      fireEvent.click(within(card).getByRole("button", { name: "Delete" }));
      expect(screen.getByText("Notifications deleted: 1")).toBeInTheDocument();
      await act(async () => { vi.advanceTimersByTime(6000); });
      expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
      expect(store.get<Record<string, { deleted: string[] }>>("dashNotices", {})["meena.r"].deleted).toEqual(["NT-1037"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("renames a document through window.prompt, refusing an empty name", async () => {
    await renderBoard();
    const doc = screen.getByText("Water charges receipt").closest("li")!;
    const prompt = vi.spyOn(window, "prompt").mockReturnValueOnce("   ").mockReturnValueOnce("Water receipt (Nov)");
    fireEvent.contextMenu(doc);
    fireEvent.click(screen.getByRole("menuitem", { name: "Rename…" }));
    expect(prompt).toHaveBeenCalledWith("New name for this document", "Water charges receipt");
    expect(screen.getByText("The name was not changed: a document needs a name.")).toBeInTheDocument();
    fireEvent.contextMenu(doc);
    fireEvent.click(screen.getByRole("menuitem", { name: "Rename…" }));
    expect(screen.getByText("Water receipt (Nov)")).toBeInTheDocument();
    expect(store.get<Record<string, Record<string, string>>>("docNames", {})["meena.r"]).toEqual({ "DOC-7729": "Water receipt (Nov)" });
    prompt.mockRestore();
  });
});

describe("Contact form", () => {
  it("ignores typing in the aria-disabled email until Change email, then saves", async () => {
    const saved = vi.fn();
    renderWithProviders(<ContactForm session={session} email={session.email} onSaved={saved} />);
    const email = screen.getByLabelText("Email address") as HTMLInputElement;
    expect(email).toHaveAttribute("aria-disabled", "true");
    expect(email.disabled).toBe(false);
    fireEvent.change(email, { target: { value: "x@y.example" } });
    expect(email.value).toBe("meena.r@mail.example");
    expect(screen.getByLabelText("Astheen ID")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Registered mobile number")).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Change email" }));
    expect(email).toHaveAttribute("aria-disabled", "false");
    fireEvent.change(email, { target: { value: "not-an-email" } });
    fireEvent.click(screen.getByRole("button", { name: "Save email" }));
    expect(await screen.findByText(/Enter a valid email address/)).toBeInTheDocument();
    fireEvent.change(email, { target: { value: "meena.new@mail.example" } });
    fireEvent.click(screen.getByRole("button", { name: "Save email" }));
    expect(await screen.findByText("Your email address has been updated.")).toBeInTheDocument();
    expect(saved).toHaveBeenCalledWith("meena.new@mail.example");
    expect(store.get<Record<string, string>>("contactEmail", {})["meena.r"]).toBe("meena.new@mail.example");
  });
});
