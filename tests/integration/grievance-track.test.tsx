import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "./render";
import { GrievanceTracker } from "@/modules/grievance/GrievanceTracker";
import { allGrievances, checkGrievanceStatus, myGrievances, rateResolution, rescheduleInspection } from "@/mock/endpoints/grievance";
import { saveApplication } from "@/lib/applications";
import { store } from "@/mock/store";
import { firstAvailable } from "@/modules/grievance/tracking";
import { addDays, todayISO } from "@/lib/format";

const track = (ref: string) => {
  fireEvent.change(screen.getByLabelText("Grievance number"), { target: { value: ref } });
  fireEvent.click(screen.getByRole("button", { name: "Track" }));
};

describe("Grievance tracking", () => {
  it("passes the number into the not-found message", async () => {
    renderWithProviders(<GrievanceTracker />);
    track("amc/gr/2026/999999");
    expect(await screen.findByText("No grievance was found with the number AMC/GR/2026/999999. Check the number and try again.")).toBeInTheDocument();
  });

  it("asks for a number in the right format", () => {
    renderWithProviders(<GrievanceTracker />);
    fireEvent.click(screen.getByRole("button", { name: "Track" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter your grievance number.");
    track("4598");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter the grievance number as shown on your acknowledgement");
  });

  it("shows a seeded grievance with its timeline and rating panel", async () => {
    renderWithProviders(<GrievanceTracker />);
    track("AMC/GR/2026/004598");
    expect(await screen.findByRole("heading", { name: "Grievance AMC/GR/2026/004598" })).toBeInTheDocument();
    expect(screen.getByText("Resolved", { selector: "#gt-status" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Your rating" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Submit feedback" }));
    expect(screen.getByText("Choose a rating from 1 to 5 stars.")).toBeInTheDocument();
  });

  it("focuses the first available day when the reschedule calendar opens", async () => {
    renderWithProviders(<GrievanceTracker />);
    track("AMC/GR/2026/004612");
    fireEvent.click(await screen.findByRole("button", { name: "Reschedule inspection" }));
    const grid = screen.getByRole("grid");
    await waitFor(() => expect(grid.contains(document.activeElement)).toBe(true));
    const first = firstAvailable(addDays(todayISO(), 1), todayISO())!;
    expect(document.activeElement?.getAttribute("aria-disabled")).toBeNull();
    expect(Number(document.activeElement?.textContent)).toBe(Number(first.slice(8)));
    expect(within(grid).queryAllByRole("button")).toHaveLength(0);
  });

  describe("on a fixed day (Monday 16/11/2026)", () => {
    afterEach(() => { vi.useRealTimers(); });

    it("explains the day actually clicked, including days outside the booking window", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(2026, 10, 16, 10, 0));
      renderWithProviders(<GrievanceTracker />);
      track("AMC/GR/2026/004612");
      fireEvent.click(await screen.findByRole("button", { name: "Reschedule inspection" }));
      const grid = screen.getByRole("grid");
      const day = (name: string) => within(grid).getByRole("gridcell", { name });

      fireEvent.click(day("Thursday, 5 November 2026"));
      expect(screen.getByText("05/11/2026 is not available: outside the booking period.")).toBeInTheDocument();
      fireEvent.click(day("Monday, 16 November 2026")); // today
      expect(screen.getByText("16/11/2026 is not available: outside the booking period.")).toBeInTheDocument();
      fireEvent.click(day("Friday, 27 November 2026"));
      expect(screen.getByText("27/11/2026 is not available: public holiday, Astheenapuram Foundation Day.")).toBeInTheDocument();
      expect(screen.getByText("None chosen")).toBeInTheDocument();

      fireEvent.click(day("Wednesday, 18 November 2026"));
      expect(screen.getByText("18/11/2026 is available.")).toBeInTheDocument();
      expect(document.querySelector("#gt-new-date")).toHaveTextContent("18/11/2026");
    });
  });

  it("lists a signed-in citizen's grievances, including ones registered in this browser", () => {
    saveApplication({
      ref: "AMC/GR/2026/004901", service: "grievance", title: "Grievance – Roads", submittedAt: new Date().toISOString(), status: "Submitted",
      details: { category: "roads", ward: "W14", description: "Pothole", inspectionTime: "10:30", photos: "", mobile: "9841023456", due: todayISO() },
    });
    const mine = myGrievances("meena.r", "+91 98410 23456").map((g) => g.ref);
    expect(mine).toHaveLength(15);
    expect(mine[0]).toBe("AMC/GR/2026/004901");
    expect(myGrievances("arul.k", "9790011223")).toHaveLength(3);
  });
});

describe("Grievance tracking endpoints", () => {
  it("moves a new grievance on one stage per check, up to inspection scheduled", async () => {
    const ref = "AMC/GR/2026/004655";
    expect((await checkGrievanceStatus(ref))?.stage).toBe(1);
    const g = await checkGrievanceStatus(ref);
    expect(g?.stage).toBe(2);
    expect(g?.inspectionDate).toBe(firstAvailable(addDays(todayISO(), 2), todayISO()));
    expect((await checkGrievanceStatus(ref))?.stage).toBe(2);
    expect(store.get<Record<string, { stage: number }>>("grievanceProgress", {})[ref].stage).toBe(2);
  });

  it("refuses unavailable dates and ratings of open grievances", async () => {
    await expect(rescheduleInspection("AMC/GR/2026/004612", addDays(todayISO(), 60))).rejects.toThrow();
    await expect(rateResolution("AMC/GR/2026/004612", 4, "")).rejects.toThrow();
    const date = firstAvailable(addDays(todayISO(), 5), todayISO())!;
    expect((await rescheduleInspection("AMC/GR/2026/004612", date)).inspectionDate).toBe(date);
    expect((await rateResolution("AMC/GR/2026/004598", 4, "ok")).rating).toBe(4);
    expect(allGrievances().find((x) => x.ref === "AMC/GR/2026/004598")?.comment).toBe("ok");
  });
});
