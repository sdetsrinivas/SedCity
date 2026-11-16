import { describe, expect, it } from "vitest";
import { useState } from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "@/components/ui/Modal";
import { renderWithProviders } from "./render";

function Nested() {
  const [outer, setOuter] = useState(false);
  const [inner, setInner] = useState(false);
  return (
    <>
      <button onClick={() => setOuter(true)}>open</button>
      <Modal open={outer} onClose={() => setOuter(false)} title="Outer">
        <button onClick={() => setInner(true)}>more</button>
      </Modal>
      <Modal open={outer && inner} onClose={() => setInner(false)} title="Inner"><p>inner body</p></Modal>
    </>
  );
}

describe("Modal stacking (DLG-07 groundwork)", () => {
  it("Escape closes only the top-most modal, and body scroll is restored at the end", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Nested />);
    await user.click(screen.getByText("open"));
    await user.click(screen.getByText("more"));
    expect(screen.getAllByRole("dialog")).toHaveLength(2);
    expect(document.body.style.overflow).toBe("hidden");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Inner" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Outer" })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });
});
