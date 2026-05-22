import { afterEach, describe, expect, it, vi } from "vitest";
import { cloudflarePages } from "../pages";
import type { ProviderCredentials } from "../../types";

const creds: ProviderCredentials = {
  provider: "cloudflare",
  email: "u@e.com",
  apiKey: "k",
};

describe("cloudflarePages", () => {
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
                  name: "site",
                  subdomain: "site.pages.dev",
                  created_on: "2026-05-22T00:00:00Z",
                },
              ],
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const projects = await cloudflarePages.list(creds);

    expect(projects).toEqual([
      {
        id: "site",
        name: "site",
        subdomain: "site.pages.dev",
        createdOn: "2026-05-22T00:00:00Z",
        raw: {
          name: "site",
          subdomain: "site.pages.dev",
          created_on: "2026-05-22T00:00:00Z",
        },
      },
    ]);
  });
});
