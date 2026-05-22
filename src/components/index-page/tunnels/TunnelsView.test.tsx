import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TunnelsView } from "./TunnelsView";

describe("TunnelsView", () => {
  it("renders tunnel names", () => {
    render(
      <TunnelsView
        tunnels={[{ id: "t1", name: "edge", created_at: "2026-05-20T00:00:00Z" }]}
        isLoading={false}
        onRefresh={vi.fn()}
        onCreate={vi.fn()}
        onEdit={vi.fn()}
        onConfig={vi.fn()}
        onRoute={vi.fn()}
      />,
    );

    expect(screen.getByText("edge")).toBeInTheDocument();
  });
});
