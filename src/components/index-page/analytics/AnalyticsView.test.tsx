import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AnalyticsView } from "./AnalyticsView";
import type { AnalyticsData } from "./analytics-types";

const analyticsData: AnalyticsData = {
  viewer: {
    zones: [
      {
        httpRequests1dGroups: [
          {
            dimensions: { date: "2026-05-20" },
            sum: {
              requests: 100,
              bytes: 1073741824,
              threats: 5,
              cachedRequests: 25,
              cachedBytes: 536870912,
              encryptedRequests: 90,
              encryptedBytes: 805306368,
              pageViews: 60,
              browserMap: [
                { uaBrowserFamily: "Chrome", requests: 55 },
                { uaBrowserFamily: "Safari", requests: 25 },
              ],
              countryMap: [
                { clientCountryName: "中国", requests: 40 },
                { clientCountryName: "美国", requests: 35 },
              ],
              contentTypeMap: [
                { edgeResponseContentTypeName: "text/html", requests: 45 },
                { edgeResponseContentTypeName: "application/javascript", requests: 30 },
              ],
              responseStatusMap: [
                { edgeResponseStatus: "200", requests: 80 },
                { edgeResponseStatus: "404", requests: 15 },
                { edgeResponseStatus: "500", requests: 5 },
              ],
            },
            uniq: { uniques: 12 },
          },
        ],
        deviceTypeGroups: [
          { dimensions: { date: "2026-05-20", metric: "desktop" }, sum: { requests: 45 } },
          { dimensions: { date: "2026-05-20", metric: "mobile" }, sum: { requests: 48 } },
          { dimensions: { date: "2026-05-20", metric: "tablet" }, sum: { requests: 7 } },
        ],
      },
    ],
  },
};

describe("AnalyticsView", () => {
  it("renders aggregate cards from typed analytics data", () => {
    render(
      <AnalyticsView
        analyticsData={analyticsData}
        analyticsPeriod="7d"
        isLoading={false}
        selectedZoneName="example.com"
        onBack={vi.fn()}
        onRefresh={vi.fn()}
        onPeriodChange={vi.fn()}
      />,
    );

    const totalRequestsLabels = screen.getAllByText("总请求数");
    expect(totalRequestsLabels.length).toBeGreaterThan(0);
    const totalRequestsCard = totalRequestsLabels[0].closest("div")?.parentElement;
    expect(totalRequestsCard).not.toBeNull();
    expect(within(totalRequestsCard as HTMLElement).getByText("100")).toBeInTheDocument();
    expect(screen.getAllByText("1.00 GB").length).toBeGreaterThan(0);
  });

  it("emits period changes through a callback", async () => {
    const onPeriodChange = vi.fn();
    const user = userEvent.setup();

    render(
      <AnalyticsView
        analyticsData={analyticsData}
        analyticsPeriod="7d"
        isLoading={false}
        selectedZoneName="example.com"
        onBack={vi.fn()}
        onRefresh={vi.fn()}
        onPeriodChange={onPeriodChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "24小时" }));
    expect(onPeriodChange).toHaveBeenCalledWith("24h");
  });

  it("keeps legacy analytics blocks visible with empty states when data is missing", () => {
    render(
      <AnalyticsView
        analyticsData={null}
        analyticsPeriod="7d"
        isLoading={false}
        selectedZoneName="example.com"
        onBack={vi.fn()}
        onRefresh={vi.fn()}
        onPeriodChange={vi.fn()}
      />,
    );

    expect(screen.getByText("请求类型统计")).toBeInTheDocument();
    expect(screen.getByText("威胁分析")).toBeInTheDocument();
    expect(screen.getByText("DNS 查询分析")).toBeInTheDocument();
    expect(screen.getByText("防火墙事件日志")).toBeInTheDocument();
    expect(screen.getByText("性能指标 (需要 Business 计划)")).toBeInTheDocument();
    expect(screen.getAllByText('点击"刷新数据"按钮获取分析数据').length).toBeGreaterThan(0);
  });

  it("restores the legacy analytics sections after extraction", () => {
    render(
      <AnalyticsView
        analyticsData={analyticsData}
        analyticsPeriod="7d"
        isLoading={false}
        selectedZoneName="example.com"
        onBack={vi.fn()}
        onRefresh={vi.fn()}
        onPeriodChange={vi.fn()}
      />,
    );

    expect(screen.getByText("请求类型统计")).toBeInTheDocument();
    expect(screen.getByText("威胁分析")).toBeInTheDocument();
    expect(screen.getByText("请求国别分布")).toBeInTheDocument();
    expect(screen.getByText("HTTP 状态码分布")).toBeInTheDocument();
    expect(screen.getByText("内容类型分析")).toBeInTheDocument();
    expect(screen.getByText("设备类型分布")).toBeInTheDocument();
    expect(screen.getByText("浏览器分布")).toBeInTheDocument();
    expect(screen.getByText("DNS 查询分析")).toBeInTheDocument();
    expect(screen.getByText("防火墙事件日志")).toBeInTheDocument();
    expect(screen.getByText("性能指标 (需要 Business 计划)")).toBeInTheDocument();
  });

  it("disables period controls while analytics are loading", () => {
    render(
      <AnalyticsView
        analyticsData={analyticsData}
        analyticsPeriod="7d"
        isLoading
        selectedZoneName="example.com"
        onBack={vi.fn()}
        onRefresh={vi.fn()}
        onPeriodChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "24小时" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "7天" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "30天" })).toBeDisabled();
  });
});
