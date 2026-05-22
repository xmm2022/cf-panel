import { afterEach, describe, expect, it, vi } from "vitest";
import { cloudflareD1 } from "../d1";
import type { ProviderCredentials } from "../../types";

const creds: ProviderCredentials = {
  provider: "cloudflare",
  email: "u@e.com",
  apiKey: "k",
};

describe("cloudflareD1", () => {
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
                { uuid: "db1", name: "main", created_at: "2026-05-22T00:00:00Z" },
              ],
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const databases = await cloudflareD1.listDatabases(creds);

    expect(databases).toEqual([
      { uuid: "db1", name: "main", createdAt: "2026-05-22T00:00:00Z" },
    ]);
  });
});
