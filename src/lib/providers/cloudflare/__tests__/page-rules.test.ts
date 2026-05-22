import { afterEach, describe, expect, it, vi } from "vitest";
import { cloudflarePageRules } from "../page-rules";
import type { ProviderCredentials } from "../../types";

const creds: ProviderCredentials = {
  provider: "cloudflare",
  email: "u@e.com",
  apiKey: "k",
};

describe("cloudflarePageRules", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("normalizes list response", async () => {
    const targets = [{ target: "url", constraint: { value: "example.com/*" } }];
    const actions = [{ id: "cache_level", value: "cache_everything" }];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              success: true,
              result: [{ id: "pr1", status: "active", targets, actions }],
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const rules = await cloudflarePageRules.list(creds, "z1");

    expect(rules).toEqual([
      {
        id: "pr1",
        zoneId: "z1",
        status: "active",
        rawTargets: targets,
        rawActions: actions,
      },
    ]);
  });
});
