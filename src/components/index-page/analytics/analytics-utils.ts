import type { AnalyticsData, AnalyticsGroup } from "./analytics-types";

export const getHttpGroups = (data: AnalyticsData | null): AnalyticsGroup[] =>
  data?.viewer?.zones?.[0]?.httpRequests1dGroups?.slice().sort((a, b) => a.dimensions.date.localeCompare(b.dimensions.date)) ??
  [];

export const sumGroupField = (groups: AnalyticsGroup[], field: keyof NonNullable<AnalyticsGroup["sum"]>): number =>
  groups.reduce((sum, group) => sum + Number(group.sum?.[field] ?? 0), 0);

export const getPeakUniques = (groups: AnalyticsGroup[]): number =>
  Math.max(0, ...groups.map((group) => Number(group.uniq?.uniques ?? 0)));
