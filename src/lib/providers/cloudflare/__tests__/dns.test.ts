import { afterEach, describe, expect, it, vi } from "vitest";
import { cloudflareDns } from "../dns";
import type { ProviderCredentials } from "../../types";

const creds: ProviderCredentials = {
  provider: "cloudflare",
  email: "u@e.com",
  apiKey: "k",
};

describe("cloudflareDns", () => {
  afterEach(() => vi.restoreAllMocks());

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
                  id: "r1",
                  type: "A",
                  name: "a.example.com",
                  content: "1.2.3.4",
                  ttl: 1,
                  proxied: true,
                },
              ],
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const records = await cloudflareDns.list(creds, "z1");

    expect(records[0]).toMatchObject({
      id: "r1",
      zoneId: "z1",
      type: "A",
      proxied: true,
    });
  });
});
