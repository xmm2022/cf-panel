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

  it("lists EdgeOne functions by zone with the documented DescribeFunctions API", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            Response: {
              Zones: [
                { ZoneId: "zone-1", ZoneName: "example.com", Status: "active" },
                { ZoneId: "zone-2", ZoneName: "example.net", Status: "active" },
              ],
              TotalCount: 2,
              RequestId: "zones-rid",
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            Response: {
              Functions: [
                {
                  FunctionId: "ef-1",
                  ZoneId: "zone-1",
                  Name: "hello-edge",
                  Content: "addEventListener('fetch', event => event.respondWith(new Response('ok')))",
                  Domain: "hello-edge-zone-1.example.edge",
                  CreateTime: "2026-05-19T00:00:00+08:00",
                  UpdateTime: "2026-05-20T00:00:00+08:00",
                },
              ],
              TotalCount: 1,
              RequestId: "functions-1-rid",
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            Response: {
              Functions: [],
              TotalCount: 0,
              RequestId: "functions-2-rid",
            },
          }),
          { status: 200 },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    const workers = await edgeoneWorkers.list(creds);

    expect(workers).toEqual([
      { id: "hello-edge", modifiedOn: "2026-05-20T00:00:00+08:00" },
    ]);

    const requestBodies = fetchMock.mock.calls.map(([, init]) =>
      JSON.parse(String((init as RequestInit).body)),
    );

    expect(requestBodies).toEqual([
      { action: "DescribeZones", payload: { Limit: 1000 } },
      { action: "DescribeFunctions", payload: { ZoneId: "zone-1", Offset: 0, Limit: 200 } },
      { action: "DescribeFunctions", payload: { ZoneId: "zone-2", Offset: 0, Limit: 200 } },
    ]);
    expect(requestBodies.map((body) => body.action)).not.toContain("DescribeEdgeFunctions");
  });
});
