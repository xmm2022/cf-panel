import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CertificatesView } from "./CertificatesView";

describe("CertificatesView", () => {
  it("renders certificate hosts", () => {
    render(
      <CertificatesView
        certificates={[
          {
            id: "cert-1",
            hosts: ["example.com"],
            expiresOn: "2026-06-01",
            status: "active",
          },
        ]}
        isLoading={false}
        onBack={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );

    expect(screen.getByText("example.com")).toBeInTheDocument();
    expect(screen.getByText(/2026-06-01/)).toBeInTheDocument();
  });
});
