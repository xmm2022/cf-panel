import { afterEach, describe, expect, it, vi } from "vitest";
import { cloudflareKv } from "../kv";
import type { ProviderCredentials } from "../../types";

const creds: ProviderCredentials = {
  provider: "cloudflare",
  email: "u@e.com",
  apiKey: "k",
};

describe("cloudflareKv", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("lists namespaces", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: { success: true, result: [{ id: "ns1", title: "main" }] },
          }),
          { status: 200 },
        ),
      ),
    );

    const list = await cloudflareKv.listNamespaces(creds);

    expect(list).toEqual([{ id: "ns1", title: "main" }]);
  });
});
