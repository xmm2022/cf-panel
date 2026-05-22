import { afterEach, describe, expect, it, vi } from "vitest";
import { cloudflareAnalytics } from "../analytics";
import type { ProviderCredentials } from "../../types";

const creds: ProviderCredentials = {
  provider: "cloudflare",
  email: "u@e.com",
  apiKey: "k",
};

describe("cloudflareAnalytics", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("normalizes analytics response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              success: true,
              result: {
                viewer: {
                  zones: [
                    {
                      httpRequests1dGroups: [
                        {
                          dimensions: { date: "2026-05-22" },
                          sum: {
                            requests: 10,
                            bytes: 20,
                            threats: 1,
                            cachedRequests: 4,
                            cachedBytes: 8,
                          },
                          uniq: { uniques: 3 },
                        },
                      ],
                    },
                  ],
                },
              },
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const points = await cloudflareAnalytics.fetch(creds, "z1", "7d");

    expect(points).toEqual([
      {
        date: "2026-05-22",
        requests: 10,
        bytes: 20,
        threats: 1,
        cachedRequests: 4,
        cachedBytes: 8,
        uniques: 3,
      },
    ]);
  });
});
