import { afterEach, describe, expect, it, vi } from "vitest";
import { edgeoneWorkers } from "../workers";
import type { ProviderCredentials } from "../../types";

const creds: ProviderCredentials = {
  provider: "edgeone",
  secretId: "id",
  secretKey: "k",
};

describe("edgeoneWorkers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes DescribeEdgeFunctions response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            Response: {
              EdgeFunctions: [
                {
                  FunctionId: "fn-1",
                  FunctionName: "hello-edge",
                  UpdateTime: "2026-05-20T00:00:00Z",
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

    const workers = await edgeoneWorkers.list(creds);

    expect(workers).toEqual([
      { id: "hello-edge", modifiedOn: "2026-05-20T00:00:00Z" },
    ]);
  });
});
