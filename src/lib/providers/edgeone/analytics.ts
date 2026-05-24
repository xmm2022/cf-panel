import type {
  AnalyticsCapability,
  AnalyticsPeriod,
  AnalyticsPoint,
} from "../capabilities/analytics";
import { callEdgeOne } from "./_invoke";

interface RawDetail {
  Timestamp?: number;
  Value?: number;
}

interface RawSeries {
  MetricName?: string;
  DetailData?: RawDetail[];
  Detail?: RawDetail[];
}

interface RawTimingDataRecord {
  TypeKey?: string;
  TypeValue?: RawSeries[];
  FloatTypeValue?: RawSeries[];
}

interface RawAnalyticsResponse {
  Data?: RawTimingDataRecord[] | RawSeries[];
}

function periodToRange(period: AnalyticsPeriod): {
  StartTime: string;
  EndTime: string;
  Interval: "hour" | "day";
} {
  const now = new Date();
  const days = period === "24h" ? 1 : period === "7d" ? 7 : 30;
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  return {
    StartTime: start.toISOString(),
    EndTime: now.toISOString(),
    Interval: period === "24h" ? "hour" : "day",
  };
}

function emptyPoint(timestamp: number): AnalyticsPoint {
  return {
    date: new Date(timestamp * 1000).toISOString().slice(0, 10),
    requests: 0,
    bytes: 0,
    threats: 0,
    cachedRequests: 0,
    cachedBytes: 0,
  };
}

function normalizeAnalytics(data: RawSeries[] = []): AnalyticsPoint[] {
  const byTimestamp = new Map<number, AnalyticsPoint>();

  for (const series of data) {
    for (const detail of series.Detail ?? series.DetailData ?? []) {
      if (detail.Timestamp === undefined || detail.Value === undefined) continue;
      const point = byTimestamp.get(detail.Timestamp) ?? emptyPoint(detail.Timestamp);

      switch (series.MetricName) {
        case "l7Flow_request":
          point.requests = detail.Value;
          break;
        case "l7Flow_outFlux":
          point.bytes = detail.Value;
          break;
        case "l7Flow_hit_outFlux":
          point.cachedBytes = detail.Value;
          break;
      }

      byTimestamp.set(detail.Timestamp, point);
    }
  }

  return [...byTimestamp.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, point]) => point);
}

function flattenSeries(data: RawAnalyticsResponse["Data"] = []): RawSeries[] {
  return data.flatMap((record) => {
    if ("MetricName" in record) return [record];
    return [...(record.TypeValue ?? []), ...(record.FloatTypeValue ?? [])];
  });
}

export const edgeoneAnalytics: AnalyticsCapability = {
  async fetch(creds, zoneId, period) {
    const result = await callEdgeOne<RawAnalyticsResponse>(
      "DescribeTimingL7AnalysisData",
      creds,
      {
        ZoneIds: [zoneId],
        MetricNames: ["l7Flow_request", "l7Flow_outFlux", "l7Flow_hit_outFlux"],
        ...periodToRange(period),
      },
    );

    return normalizeAnalytics(flattenSeries(result.Data));
  },
};
