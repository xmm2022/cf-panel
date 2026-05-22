import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WorkersView } from "./WorkersView";

describe("WorkersView", () => {
  it("renders worker script names and triggers edit", async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();

    render(
      <WorkersView
        scripts={[{ id: "hello-worker", modifiedOn: "2026-05-20T00:00:00Z" }]}
        isLoading={false}
        onRefresh={vi.fn()}
        onCreate={vi.fn()}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("hello-worker")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /编辑/i }));
    expect(onEdit).toHaveBeenCalledWith("hello-worker");
  });
});
