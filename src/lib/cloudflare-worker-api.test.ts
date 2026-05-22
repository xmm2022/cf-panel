import { afterEach, describe, expect, it, vi } from "vitest";
import { invokeProviderApi } from "./cloudflare-worker-api";
import type { ProviderCredentials } from "./providers/types";

describe("invokeProviderApi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("sends X-Provider-Auth header for cloudflare", async () => {
    const creds: ProviderCredentials = {
      provider: "cloudflare",
      email: "u@e.com",
      apiKey: "k",
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { success: true, result: [] } }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await invokeProviderApi("cloudflare-api", { action: "list_zones" }, creds);

    const [, init] = fetchMock.mock.calls[0];
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Provider-Auth"]).toMatch(/^cloudflare /);
  });

  it("routes edgeone calls to /api/edgeone-api endpoint", async () => {
    const creds: ProviderCredentials = {
      provider: "edgeone",
      secretId: "id",
      secretKey: "k",
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await invokeProviderApi("auto", { action: "DescribeZones" }, creds);

    expect(fetchMock.mock.calls[0][0]).toContain("/api/edgeone-api");
  });
});
