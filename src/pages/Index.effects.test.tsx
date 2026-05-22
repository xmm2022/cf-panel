import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Index from "./Index";

describe("Index effects", () => {
  it("does not call view loaders before their view becomes active", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>,
    );

    expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining("Maximum update depth exceeded"));
    errorSpy.mockRestore();
  });
});
