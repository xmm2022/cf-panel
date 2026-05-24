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
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          Response: {
            RuleItems: [
              {
                RuleId: "r1",
                RuleName: "a.example.com",
                Status: "enable",
                Rules: [
                  {
                    Conditions: [
                      {
                        Conditions: [
                          { Target: "host", Operator: "equal", Values: ["a.example.com"] },
                        ],
                      },
                    ],
                    Actions: [],
                  },
                ],
                RulePriority: 3,
              },
            ],
            RequestId: "rid",
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const list = await edgeonePageRules.list(creds, "zone-1");

    expect(list[0]).toMatchObject({
      id: "r1",
      zoneId: "zone-1",
      status: "active",
      priority: 3,
    });
    expect(list[0].rawTargets).toEqual([
      { Target: "host", Operator: "equal", Values: ["a.example.com"] },
    ]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      action: "DescribeRules",
      payload: { ZoneId: "zone-1" },
    });
  });

  it("deletes rules with the documented batch DeleteRules API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ Response: { RequestId: "rid" } }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await edgeonePageRules.delete(creds, "zone-1", "r1");

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      action: "DeleteRules",
      payload: { ZoneId: "zone-1", RuleIds: ["r1"] },
    });
  });

  it("does not send Cloudflare-style create/update payloads to the EdgeOne rule engine", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      edgeonePageRules.create(creds, "zone-1", {
        status: "active",
        rawTargets: [],
        rawActions: [],
      }),
    ).rejects.toMatchObject({
      provider: "edgeone",
      message: "EdgeOne rule engine create is not mapped to Cloudflare Page Rules",
    });

    await expect(
      edgeonePageRules.update(creds, "zone-1", {
        id: "r1",
        zoneId: "zone-1",
        status: "active",
        rawTargets: [],
        rawActions: [],
      }),
    ).rejects.toMatchObject({
      provider: "edgeone",
      message: "EdgeOne rule engine update is not mapped to Cloudflare Page Rules",
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
