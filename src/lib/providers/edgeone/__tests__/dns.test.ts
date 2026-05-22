import { afterEach, describe, expect, it, vi } from "vitest";
import { edgeoneDns } from "../dns";
import type { ProviderCredentials } from "../../types";

const creds: ProviderCredentials = {
  provider: "edgeone",
  secretId: "id",
  secretKey: "k",
};

describe("edgeoneDns", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes DescribeDnsRecords response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            Response: {
              DnsRecords: [
                {
                  RecordId: "r1",
                  Type: "A",
                  Name: "a.example.com",
                  Content: "1.2.3.4",
                  TTL: 600,
                },
              ],
              TotalCount: 1,
              RequestId: "rid",
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const records = await edgeoneDns.list(creds, "zone-xyz");

    expect(records[0]).toMatchObject({
      id: "r1",
      zoneId: "zone-xyz",
      type: "A",
      content: "1.2.3.4",
      ttl: 600,
    });
  });
});
