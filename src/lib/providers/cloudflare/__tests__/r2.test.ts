import { afterEach, describe, expect, it, vi } from "vitest";
import { cloudflareR2 } from "../r2";
import type { ProviderCredentials } from "../../types";

const creds: ProviderCredentials = {
  provider: "cloudflare",
  email: "u@e.com",
  apiKey: "k",
};

function zonesResponse() {
  return new Response(
    JSON.stringify({
      data: {
        success: true,
        result: [{ id: "zone1", name: "example.com", status: "active", account: { id: "acc1" } }],
      },
    }),
    { status: 200 },
  );
}

describe("cloudflareR2", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("normalizes list response", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(zonesResponse())
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              data: {
                success: true,
                result: {
                  buckets: [{ name: "assets", creation_date: "2026-05-22T00:00:00Z" }],
                },
              },
            }),
            { status: 200 },
          ),
        ),
    );

    const buckets = await cloudflareR2.listBuckets(creds);

    expect(buckets).toEqual([
      { name: "assets", creationDate: "2026-05-22T00:00:00Z" },
    ]);
  });
});
