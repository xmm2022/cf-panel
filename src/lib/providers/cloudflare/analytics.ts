import type {
  AnalyticsCapability,
  AnalyticsPeriod,
  AnalyticsPoint,
} from "../capabilities/analytics";
import type { ProviderCredentials } from "../types";
import { callCloudflare } from "./_invoke";

interface RawAnalyticsGroup {
  dimensions: { date: string };
  sum?: {
    requests?: number;
    bytes?: number;
    threats?: number;
    cachedRequests?: number;
    cachedBytes?: number;
  };
  uniq?: { uniques?: number };
}

interface RawAnalytics {
  viewer?: {
    zones?: Array<{
      httpRequests1dGroups?: RawAnalyticsGroup[];
    }>;
  };
}

function normalizeAnalytics(raw: RawAnalytics): AnalyticsPoint[] {
  const groups = raw.viewer?.zones?.[0]?.httpRequests1dGroups ?? [];

  return groups.map((group) => ({
    date: group.dimensions.date,
    requests: group.sum?.requests ?? 0,
    bytes: group.sum?.bytes ?? 0,
    threats: group.sum?.threats ?? 0,
    cachedRequests: group.sum?.cachedRequests ?? 0,
    cachedBytes: group.sum?.cachedBytes ?? 0,
    uniques: group.uniq?.uniques,
  }));
}

export const cloudflareAnalytics: AnalyticsCapability = {
  async fetch(
    creds: ProviderCredentials,
    zoneId: string,
    period: AnalyticsPeriod,
  ) {
    const result = await callCloudflare<RawAnalytics>("get_analytics", creds, {
      zoneId,
      data: { period },
    });
    return normalizeAnalytics(result);
  },
};
