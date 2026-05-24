import { afterEach, describe, expect, it, vi } from "vitest";
import { edgeoneAnalytics } from "../analytics";
import type { ProviderCredentials } from "../../types";

const creds: ProviderCredentials = {
  provider: "edgeone",
  secretId: "id",
  secretKey: "k",
};

describe("edgeoneAnalytics", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes DescribeTimingL7AnalysisData into AnalyticsPoint[]", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          Response: {
            Data: [
              {
                TypeKey: "appid",
                TypeValue: [
                  {
                    MetricName: "l7Flow_request",
                    Detail: [
                      { Timestamp: 1716163200, Value: 100 },
                      { Timestamp: 1716249600, Value: 200 },
                    ],
                  },
                  {
                    MetricName: "l7Flow_outFlux",
                    Detail: [
                      { Timestamp: 1716163200, Value: 1024 },
                      { Timestamp: 1716249600, Value: 2048 },
                    ],
                  },
                  {
                    MetricName: "l7Flow_hit_outFlux",
                    Detail: [
                      { Timestamp: 1716163200, Value: 512 },
                      { Timestamp: 1716249600, Value: 1024 },
                    ],
                  },
                ],
              },
            ],
            TotalCount: 2,
            RequestId: "rid",
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const points = await edgeoneAnalytics.fetch(creds, "zone-1", "7d");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/edgeone-api"),
      expect.objectContaining({
        body: expect.stringContaining("DescribeTimingL7AnalysisData"),
      }),
    );
    expect(points).toEqual([
      {
        date: "2024-05-20",
        requests: 100,
        bytes: 1024,
        threats: 0,
        cachedRequests: 0,
        cachedBytes: 512,
      },
      {
        date: "2024-05-21",
        requests: 200,
        bytes: 2048,
        threats: 0,
        cachedRequests: 0,
        cachedBytes: 1024,
      },
    ]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      action: "DescribeTimingL7AnalysisData",
      payload: {
        ZoneIds: ["zone-1"],
        MetricNames: ["l7Flow_request", "l7Flow_outFlux", "l7Flow_hit_outFlux"],
      },
    });
  });
});
