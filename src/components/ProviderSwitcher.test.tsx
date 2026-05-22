import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProviderSwitcher } from "./ProviderSwitcher";

describe("ProviderSwitcher", () => {
  it("renders all providers and marks active one", () => {
    render(<ProviderSwitcher active="cloudflare" onChange={vi.fn()} />);

    const cloudflare = screen.getByRole("button", { name: "Cloudflare" });
    const edgeone = screen.getByRole("button", { name: "腾讯云 EdgeOne" });

    expect(cloudflare).toHaveAttribute("data-active", "true");
    expect(edgeone).toHaveAttribute("data-active", "false");
  });

  it("emits change callback when a different provider is selected", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ProviderSwitcher active="cloudflare" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "腾讯云 EdgeOne" }));

    expect(onChange).toHaveBeenCalledWith("edgeone");
  });
});
