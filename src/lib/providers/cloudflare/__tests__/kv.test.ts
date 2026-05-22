import { afterEach, describe, expect, it, vi } from "vitest";
import { cloudflareKv } from "../kv";
import type { ProviderCredentials } from "../../types";

const creds: ProviderCredentials = {
  provider: "cloudflare",
  email: "u@e.com",
  apiKey: "k",
};

function zonesResponse(accountId = "acc1") {
  return new Response(
    JSON.stringify({
      data: {
        success: true,
        result: [{ id: "zone1", name: "example.com", status: "active", account: { id: accountId } }],
      },
    }),
    { status: 200 },
  );
}

describe("cloudflareKv", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("lists namespaces", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(zonesResponse())
        .mockResolvedValueOnce(
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

  it("derives account id for account-scoped actions", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(zonesResponse())
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { success: true, result: [{ id: "ns1", title: "main" }] },
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await cloudflareKv.listNamespaces(creds);

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).action).toBe("list_zones");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({
      action: "list_kv_namespaces",
      accountId: "acc1",
    });
  });
});
