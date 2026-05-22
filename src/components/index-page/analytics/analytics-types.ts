export type AnalyticsPeriod = "24h" | "7d" | "30d";

export interface AnalyticsBreakdownItem {
  requests?: number;
  edgeResponseStatus?: string;
  uaBrowserFamily?: string;
  clientCountryName?: string;
  edgeResponseContentTypeName?: string;
}

export interface AnalyticsGroup {
  dimensions: {
    date: string;
    metric?: string;
    [key: string]: string | undefined;
  };
  sum?: {
    requests?: number;
    bytes?: number;
    threats?: number;
    cachedRequests?: number;
    cachedBytes?: number;
    encryptedRequests?: number;
    encryptedBytes?: number;
    pageViews?: number;
    statusMap?: AnalyticsBreakdownItem[];
    responseStatusMap?: AnalyticsBreakdownItem[];
    browserMap?: AnalyticsBreakdownItem[];
    countryMap?: AnalyticsBreakdownItem[];
    contentTypeMap?: AnalyticsBreakdownItem[];
  };
  uniq?: {
    uniques?: number;
  };
}

export interface ZoneAnalytics {
  httpRequests1dGroups?: AnalyticsGroup[];
  deviceTypeGroups?: AnalyticsGroup[];
}

export interface AnalyticsData {
  viewer?: {
    zones?: ZoneAnalytics[];
  };
}
