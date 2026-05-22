import { afterEach, describe, expect, it, vi } from "vitest";
import { edgeonePageRules } from "../page-rules";
import type { ProviderCredentials } from "../../types";

const creds: ProviderCredentials = {
  provider: "edgeone",
  secretId: "id",
  secretKey: "k",
};

describe("edgeonePageRules", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes DescribeRules response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            Response: {
              Rules: [
                {
                  RuleId: "r1",
                  Status: "active",
                  Conditions: [
                    { Target: "host", Operator: "equal", Values: ["a.example.com"] },
                  ],
                  Actions: [],
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

    const list = await edgeonePageRules.list(creds, "zone-1");

    expect(list[0]).toMatchObject({
      id: "r1",
      zoneId: "zone-1",
      status: "active",
    });
  });
});
