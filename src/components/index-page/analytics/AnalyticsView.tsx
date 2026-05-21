import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatGigabytes, formatMetricNumber, formatPercent } from "@/components/index-page/shared/formatters";
import { Gauge, HardDrive, Info, LayoutDashboard, Loader2, Network, Shield } from "lucide-react";
import type { AnalyticsData, AnalyticsPeriod } from "./analytics-types";
import { getHttpGroups, getPeakUniques, sumGroupField } from "./analytics-utils";

export interface AnalyticsViewProps {
  analyticsData: AnalyticsData | null;
  analyticsPeriod: AnalyticsPeriod;
  isLoading: boolean;
  selectedZoneName: string;
  onBack: () => void;
  onRefresh: () => void;
  onPeriodChange: (period: AnalyticsPeriod) => void;
}

const periodLabelMap: Record<AnalyticsPeriod, string> = {
  "24h": "最近 24 小时",
  "7d": "最近 7 天",
  "30d": "最近 30 天",
};

export function AnalyticsView({
  analyticsData,
  analyticsPeriod,
  isLoading,
  selectedZoneName,
  onBack,
  onRefresh,
  onPeriodChange,
}: AnalyticsViewProps) {
  const groups = getHttpGroups(analyticsData);
  const totalRequests = sumGroupField(groups, "requests");
  const totalBytes = sumGroupField(groups, "bytes");
  const totalThreats = sumGroupField(groups, "threats");
  const cachedRequests = sumGroupField(groups, "cachedRequests");
  const cachedBytes = sumGroupField(groups, "cachedBytes");

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          ← 返回域名列表
        </Button>
        <Button onClick={onRefresh} disabled={isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          刷新数据
        </Button>
      </div>

      <Card className="shadow-card mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5" />
                分析统计
              </CardTitle>
              <CardDescription>
                当前域名: {selectedZoneName} - {periodLabelMap[analyticsPeriod]}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={analyticsPeriod === "24h" ? "default" : "outline"}
                size="sm"
                onClick={() => onPeriodChange("24h")}
              >
                24小时
              </Button>
              <Button
                variant={analyticsPeriod === "7d" ? "default" : "outline"}
                size="sm"
                onClick={() => onPeriodChange("7d")}
              >
                7天
              </Button>
              <Button
                variant={analyticsPeriod === "30d" ? "default" : "outline"}
                size="sm"
                onClick={() => onPeriodChange("30d")}
              >
                30天
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 border border-border/50 rounded-lg bg-gradient-to-br from-blue-500/5 to-blue-500/10">
                <div className="text-sm text-muted-foreground mb-1">总请求数</div>
                <div className="text-2xl font-bold">{groups.length ? formatMetricNumber(totalRequests) : "-"}</div>
                <div className="text-xs text-muted-foreground mt-1">{periodLabelMap[analyticsPeriod]}</div>
              </div>
              <div className="p-4 border border-border/50 rounded-lg bg-gradient-to-br from-green-500/5 to-green-500/10">
                <div className="text-sm text-muted-foreground mb-1">带宽使用</div>
                <div className="text-2xl font-bold">{groups.length ? formatGigabytes(totalBytes) : "-"}</div>
                <div className="text-xs text-muted-foreground mt-1">{periodLabelMap[analyticsPeriod]}</div>
              </div>
              <div className="p-4 border border-border/50 rounded-lg bg-gradient-to-br from-purple-500/5 to-purple-500/10">
                <div className="text-sm text-muted-foreground mb-1">独立访客</div>
                <div className="text-2xl font-bold">
                  {groups.length ? formatMetricNumber(getPeakUniques(groups)) : "-"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">峰值</div>
              </div>
              <div className="p-4 border border-border/50 rounded-lg bg-gradient-to-br from-red-500/5 to-red-500/10">
                <div className="text-sm text-muted-foreground mb-1">威胁拦截</div>
                <div className="text-2xl font-bold">{groups.length ? formatMetricNumber(totalThreats) : "-"}</div>
                <div className="text-xs text-muted-foreground mt-1">{periodLabelMap[analyticsPeriod]}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border border-border/50 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">缓存命中率</div>
                <div className="text-2xl font-bold text-green-600">{formatPercent(cachedRequests, totalRequests)}</div>
              </div>
              <div className="p-4 border border-border/50 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">缓存字节数</div>
                <div className="text-2xl font-bold text-blue-600">{formatGigabytes(cachedBytes)}</div>
              </div>
              <div className="p-4 border border-border/50 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">带宽节省</div>
                <div className="text-2xl font-bold text-purple-600">{formatPercent(cachedBytes, totalBytes)}</div>
              </div>
            </div>

            {!groups.length && (
              <div className="h-64 flex items-center justify-center bg-muted/30 rounded">
                <div className="text-center text-muted-foreground">
                  <LayoutDashboard className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">点击"刷新数据"按钮获取分析数据</p>
                </div>
              </div>
            )}

            {!!groups.length && (
              <>
                <div className="p-4 border border-border/50 rounded-lg">
                  <h3 className="font-medium mb-4">每日流量统计</h3>
                  <div className="space-y-2">
                    {groups.map((day) => (
                      <div
                        key={day.dimensions.date}
                        className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                      >
                        <span className="text-sm font-medium">{day.dimensions.date}</span>
                        <div className="flex gap-4 text-sm flex-wrap">
                          <span className="text-muted-foreground">
                            请求:{" "}
                            <span className="font-medium text-foreground">
                              {formatMetricNumber(day.sum?.requests ?? 0)}
                            </span>
                          </span>
                          <span className="text-muted-foreground">
                            带宽:{" "}
                            <span className="font-medium text-foreground">
                              {((day.sum?.bytes ?? 0) / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </span>
                          <span className="text-muted-foreground">
                            访客:{" "}
                            <span className="font-medium text-foreground">
                              {day.uniq?.uniques ?? 0}
                            </span>
                          </span>
                          <span className="text-muted-foreground">
                            缓存:{" "}
                            <span className="font-medium text-green-600">
                              {formatPercent(day.sum?.cachedRequests ?? 0, day.sum?.requests ?? 0, 0)}
                            </span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-border/50 rounded-lg">
                    <h3 className="font-medium mb-4 flex items-center gap-2">
                      <Network className="w-4 h-4" />
                      DNS 查询分析
                    </h3>
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Info className="w-4 h-4 text-yellow-600" />
                        注意：DNS、防火墙和性能附加指标保持现有模拟展示，真实接入仍沿用当前 API 能力边界。
                      </p>
                    </div>
                  </div>
                  <div className="p-4 border border-border/50 rounded-lg">
                    <h3 className="font-medium mb-4 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      防火墙事件与性能提示
                    </h3>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Gauge className="w-4 h-4" />
                        保留现有模拟数据块，但把计算和说明文字留在组件内部。
                      </div>
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4" />
                        后续真实数据接入直接在 analytics 模块内扩展。
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
