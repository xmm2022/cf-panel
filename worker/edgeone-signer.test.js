import { describe, expect, it } from "vitest";
import { signTc3 } from "./edgeone-signer.js";

describe("signTc3", () => {
  it("matches the documented sample signature shape", async () => {
    const headers = await signTc3({
      secretId: "AKIDz8krbsJ5yKBZQpn74WFkmLPx3...",
      secretKey: "Gu5t9xGARNpq86cd98joQYCN3...",
      service: "cvm",
      host: "cvm.tencentcloudapi.com",
      action: "DescribeInstances",
      version: "2017-03-12",
      region: "ap-guangzhou",
      payload: {},
      timestamp: 1551113065,
    });

    expect(headers["X-TC-Timestamp"]).toBe("1551113065");
    expect(headers["X-TC-Action"]).toBe("DescribeInstances");
    expect(headers["X-TC-Version"]).toBe("2017-03-12");
    expect(headers["X-TC-Region"]).toBe("ap-guangzhou");
    expect(headers.Authorization).toMatch(
      /^TC3-HMAC-SHA256 Credential=AKIDz8krbsJ5yKBZQpn74WFkmLPx3\.\.\.\/2019-02-25\/cvm\/tc3_request, SignedHeaders=content-type;host, Signature=[0-9a-f]{64}$/,
    );
  });

  it("is deterministic for the same inputs", async () => {
    const args = {
      secretId: "id",
      secretKey: "k",
      service: "teo",
      host: "teo.tencentcloudapi.com",
      action: "DescribeZones",
      version: "2022-09-01",
      region: "",
      payload: { Limit: 10 },
      timestamp: 1700000000,
    };

    const a = await signTc3(args);
    const b = await signTc3(args);

    expect(a.Authorization).toBe(b.Authorization);
  });
});
