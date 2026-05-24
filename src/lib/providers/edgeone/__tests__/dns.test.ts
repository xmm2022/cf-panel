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
    const fetchMock = vi.fn().mockResolvedValue(
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
    );
    vi.stubGlobal("fetch", fetchMock);

    const records = await edgeoneDns.list(creds, "zone-xyz");

    expect(records[0]).toMatchObject({
      id: "r1",
      zoneId: "zone-xyz",
      type: "A",
      content: "1.2.3.4",
      ttl: 600,
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      action: "DescribeDnsRecords",
      payload: { ZoneId: "zone-xyz", Limit: 1000 },
    });
  });

  it("updates DNS records with the documented batch ModifyDnsRecords API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ Response: { RequestId: "rid" } }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const record = {
      id: "r1",
      zoneId: "zone-xyz",
      type: "A",
      name: "a.example.com",
      content: "1.2.3.4",
      ttl: 600,
      proxied: false,
    };

    await expect(edgeoneDns.update(creds, "zone-xyz", record)).resolves.toEqual(record);

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      action: "ModifyDnsRecords",
      payload: {
        ZoneId: "zone-xyz",
        DnsRecords: [
          {
            RecordId: "r1",
            Name: "a.example.com",
            Type: "A",
            Content: "1.2.3.4",
            TTL: 600,
          },
        ],
      },
    });
  });

  it("deletes DNS records with the documented batch DeleteDnsRecords API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ Response: { RequestId: "rid" } }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await edgeoneDns.delete(creds, "zone-xyz", "r1");

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      action: "DeleteDnsRecords",
      payload: { ZoneId: "zone-xyz", RecordIds: ["r1"] },
    });
  });
});
