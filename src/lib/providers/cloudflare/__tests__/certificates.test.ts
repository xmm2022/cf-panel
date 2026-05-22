import { afterEach, describe, expect, it, vi } from "vitest";
import { cloudflareCertificates } from "../certificates";
import type { ProviderCredentials } from "../../types";

const creds: ProviderCredentials = {
  provider: "cloudflare",
  email: "u@e.com",
  apiKey: "k",
};

describe("cloudflareCertificates", () => {
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
                  id: "cert1",
                  hosts: ["example.com"],
                  expires_on: "2026-12-31T00:00:00Z",
                  status: "active",
                },
              ],
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const certs = await cloudflareCertificates.list(creds, "z1");

    expect(certs).toEqual([
      {
        id: "cert1",
        hosts: ["example.com"],
        expiresOn: "2026-12-31T00:00:00Z",
        status: "active",
      },
    ]);
  });
});
