import { afterEach, describe, expect, it, vi } from "vitest";
import { cloudflareZones } from "../zones";
import type { ProviderCredentials } from "../../types";

const creds: ProviderCredentials = {
  provider: "cloudflare",
  email: "u@e.com",
  apiKey: "k",
};

describe("cloudflareZones", () => {
  afterEach(() => vi.restoreAllMocks());

  it("normalizes list response into Zone[]", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            success: true,
            result: [{ id: "z1", name: "example.com", status: "active" }],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const zones = await cloudflareZones.list(creds);

    expect(zones).toEqual([
      {
        id: "z1",
        name: "example.com",
        status: "active",
        provider: "cloudflare",
        raw: { id: "z1", name: "example.com", status: "active" },
      },
    ]);
  });

  it("throws ProviderError on auth failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              success: false,
              errors: [{ code: 10000, message: "Authentication error" }],
            },
          }),
          { status: 200 },
        ),
      ),
    );

    await expect(cloudflareZones.list(creds)).rejects.toMatchObject({
      provider: "cloudflare",
      code: "AUTH_INVALID",
    });
  });
});
