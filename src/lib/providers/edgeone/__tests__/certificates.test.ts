import { afterEach, describe, expect, it, vi } from "vitest";
import { edgeoneCertificates } from "../certificates";
import type { ProviderCredentials } from "../../types";

const creds: ProviderCredentials = {
  provider: "edgeone",
  secretId: "id",
  secretKey: "k",
};

describe("edgeoneCertificates", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists EdgeOne default certificates with the documented API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          Response: {
            DefaultServerCertInfo: [
              {
                CertId: "c1",
                CommonName: "example.com",
                SubjectAltName: ["www.example.com"],
                ExpireTime: "2026-06-01T00:00:00+08:00",
                Status: "deployed",
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

    const list = await edgeoneCertificates.list(creds, "zone-1");

    expect(list).toEqual([
      {
        id: "c1",
        hosts: ["example.com", "www.example.com"],
        expiresOn: "2026-06-01T00:00:00+08:00",
        status: "deployed",
      },
    ]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      action: "DescribeDefaultCertificates",
      payload: { ZoneId: "zone-1", Offset: 0, Limit: 100 },
    });
  });
});
