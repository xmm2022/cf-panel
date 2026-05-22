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

  it("normalizes DescribeHostsCertificate response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            Response: {
              Certificates: [
                {
                  CertId: "c1",
                  Hosts: ["example.com"],
                  ExpiresOn: "2026-06-01",
                  Status: "deployed",
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

    const list = await edgeoneCertificates.list(creds, "zone-1");

    expect(list).toEqual([
      {
        id: "c1",
        hosts: ["example.com"],
        expiresOn: "2026-06-01",
        status: "deployed",
      },
    ]);
  });
});
