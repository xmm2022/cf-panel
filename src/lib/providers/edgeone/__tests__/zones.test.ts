import { afterEach, describe, expect, it, vi } from "vitest";
import { edgeoneZones } from "../zones";
import type { ProviderCredentials } from "../../types";

const creds: ProviderCredentials = {
  provider: "edgeone",
  secretId: "id",
  secretKey: "k",
};

describe("edgeoneZones", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes DescribeZones response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            Response: {
              Zones: [
                { ZoneId: "zone-xyz", ZoneName: "example.com", Status: "active" },
              ],
              TotalCount: 1,
              RequestId: "rid",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const zones = await edgeoneZones.list(creds);

    expect(zones).toEqual([
      {
        id: "zone-xyz",
        name: "example.com",
        status: "active",
        provider: "edgeone",
        raw: { ZoneId: "zone-xyz", ZoneName: "example.com", Status: "active" },
      },
    ]);
  });

  it("translates TC AuthFailure into ProviderError AUTH_INVALID", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            Response: {
              Error: {
                Code: "AuthFailure.SignatureFailure",
                Message: "invalid signature",
              },
              RequestId: "rid",
            },
          }),
          { status: 200 },
        ),
      ),
    );

    await expect(edgeoneZones.list(creds)).rejects.toMatchObject({
      provider: "edgeone",
      code: "AUTH_INVALID",
    });
  });
});
