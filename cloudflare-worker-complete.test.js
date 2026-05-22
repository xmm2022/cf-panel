import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "./cloudflare-worker-complete.js";

function jsonRequest(path, body, headers = {}) {
  return new Request(`https://panel.example${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("cloudflare-worker-complete provider routes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts Cloudflare credentials from X-Provider-Auth", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, result: [] }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await worker.fetch(
      jsonRequest(
        "/api/cloudflare-api",
        { action: "list_zones" },
        { "X-Provider-Auth": "cloudflare email=user%40example.com;key=abc%20123" },
      ),
      {},
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.cloudflare.com/client/v4/zones",
      expect.objectContaining({
        headers: {
          "X-Auth-Email": "user@example.com",
          "X-Auth-Key": "abc 123",
        },
        method: "GET",
      }),
    );
  });

  it("signs and proxies EdgeOne API requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ Response: { RequestId: "req-1" } }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await worker.fetch(
      jsonRequest(
        "/api/edgeone-api",
        { action: "DescribeZones", payload: { Limit: 10 }, region: "ap-guangzhou" },
        { "X-Provider-Auth": "edgeone secretId=id;secretKey=key" },
      ),
      {},
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ Response: { RequestId: "req-1" } });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://teo.tencentcloudapi.com",
      expect.objectContaining({
        body: JSON.stringify({ Limit: 10 }),
        method: "POST",
      }),
    );

    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers.Authorization).toMatch(
      /^TC3-HMAC-SHA256 Credential=id\/\d{4}-\d{2}-\d{2}\/teo\/tc3_request, SignedHeaders=content-type;host, Signature=[0-9a-f]{64}$/,
    );
    expect(headers["X-TC-Action"]).toBe("DescribeZones");
    expect(headers["X-TC-Version"]).toBe("2022-09-01");
    expect(headers["X-TC-Region"]).toBe("ap-guangzhou");
  });

  it("rejects EdgeOne requests without EdgeOne provider auth", async () => {
    const response = await worker.fetch(
      jsonRequest("/api/edgeone-api", { action: "DescribeZones" }),
      {},
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "missing or invalid edgeone X-Provider-Auth",
    });
  });
});
