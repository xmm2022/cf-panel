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

  it("normalizes DescribeKvNamespaces response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            Response: {
              KvNamespaces: [{ NamespaceId: "ns-1", NamespaceName: "main" }],
              TotalCount: 1,
              RequestId: "rid",
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const list = await edgeoneKv.listNamespaces(creds);

    expect(list).toEqual([{ id: "ns-1", title: "main" }]);
  });
});
