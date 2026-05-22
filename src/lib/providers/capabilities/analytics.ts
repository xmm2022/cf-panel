import type { ProviderCredentials } from "../types";

export type AnalyticsPeriod = "24h" | "7d" | "30d";

export interface AnalyticsPoint {
  date: string;
  requests: number;
  bytes: number;
  threats: number;
  cachedRequests: number;
  cachedBytes: number;
  uniques?: number;
}

export interface AnalyticsCapability {
  fetch(
    creds: ProviderCredentials,
    zoneId: string,
    period: AnalyticsPeriod,
  ): Promise<AnalyticsPoint[]>;
}
