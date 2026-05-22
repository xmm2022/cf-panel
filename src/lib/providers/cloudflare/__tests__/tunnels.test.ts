import { afterEach, describe, expect, it, vi } from "vitest";
import { cloudflareTunnels } from "../tunnels";
import type { ProviderCredentials } from "../../types";

const creds: ProviderCredentials = {
  provider: "cloudflare",
  email: "u@e.com",
  apiKey: "k",
};

describe("cloudflareTunnels", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("normalizes list response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              success: true,
              result: [
                {
                  id: "tun1",
                  name: "main",
                  created_at: "2026-05-22T00:00:00Z",
                  status: "healthy",
                },
              ],
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const tunnels = await cloudflareTunnels.list(creds);

    expect(tunnels).toEqual([
      {
        id: "tun1",
        name: "main",
        createdAt: "2026-05-22T00:00:00Z",
        status: "healthy",
      },
    ]);
  });
});
