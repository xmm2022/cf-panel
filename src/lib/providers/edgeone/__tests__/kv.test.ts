import { afterEach, describe, expect, it, vi } from "vitest";
import { edgeoneKv } from "../kv";
import type { ProviderCredentials } from "../../types";

const creds: ProviderCredentials = {
  provider: "edgeone",
  secretId: "id",
  secretKey: "k",
};

describe("edgeoneKv", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists EdgeOne KV namespaces with the documented site-scoped API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          Response: {
            KVNamespaces: [{ Namespace: "main", Remark: "primary namespace" }],
            TotalCount: 1,
            RequestId: "rid",
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const list = await edgeoneKv.listNamespaces(creds, { zoneId: "zone-1" });

    expect(list).toEqual([{ id: "main", title: "main" }]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      action: "DescribeEdgeKVNamespaces",
      payload: { ZoneId: "zone-1", Offset: 0, Limit: 1000 },
    });
  });

  it("creates and deletes EdgeOne KV namespaces by zone and namespace name", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            Response: { RequestId: "create-rid" },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            Response: { RequestId: "delete-rid" },
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      edgeoneKv.createNamespace?.(creds, "main", { zoneId: "zone-1" }),
    ).resolves.toEqual({ id: "main", title: "main" });
    await edgeoneKv.deleteNamespace?.(creds, "main", { zoneId: "zone-1" });

    const requestBodies = fetchMock.mock.calls.map(([, init]) =>
      JSON.parse(String((init as RequestInit).body)),
    );

    expect(requestBodies).toEqual([
      {
        action: "CreateEdgeKVNamespace",
        payload: { ZoneId: "zone-1", Namespace: "main" },
      },
      {
        action: "DeleteEdgeKVNamespace",
        payload: { ZoneId: "zone-1", Namespace: "main" },
      },
    ]);
  });

  it("reads, writes, lists, and deletes EdgeOne KV keys with EdgeKV APIs", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            Response: { Keys: ["alpha", "beta"], Cursor: "", RequestId: "list-rid" },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            Response: {
              Data: [{ Key: "alpha", Value: "value-alpha", Expiration: "" }],
              RequestId: "get-rid",
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            Response: { RequestId: "put-rid" },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            Response: { RequestId: "delete-rid" },
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(edgeoneKv.listKeys(creds, "main", { zoneId: "zone-1" })).resolves.toEqual([
      { name: "alpha" },
      { name: "beta" },
    ]);
    await expect(edgeoneKv.getValue(creds, "main", "alpha", { zoneId: "zone-1" })).resolves.toBe(
      "value-alpha",
    );
    await edgeoneKv.putValue(creds, "main", "gamma", "value-gamma", { zoneId: "zone-1" });
    await edgeoneKv.deleteKey(creds, "main", "beta", { zoneId: "zone-1" });

    const requestBodies = fetchMock.mock.calls.map(([, init]) =>
      JSON.parse(String((init as RequestInit).body)),
    );

    expect(requestBodies).toEqual([
      {
        action: "EdgeKVList",
        payload: { ZoneId: "zone-1", Namespace: "main", Limit: 1000 },
      },
      {
        action: "EdgeKVGet",
        payload: { ZoneId: "zone-1", Namespace: "main", Keys: ["alpha"] },
      },
      {
        action: "EdgeKVPut",
        payload: { ZoneId: "zone-1", Namespace: "main", Key: "gamma", Value: "value-gamma" },
      },
      {
        action: "EdgeKVDelete",
        payload: { ZoneId: "zone-1", Namespace: "main", Keys: ["beta"] },
      },
    ]);
  });
});
