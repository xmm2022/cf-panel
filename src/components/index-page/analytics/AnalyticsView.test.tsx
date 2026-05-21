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
            sum: { requests: 100, bytes: 1073741824, threats: 5, cachedRequests: 25, cachedBytes: 536870912 },
            uniq: { uniques: 12 },
          },
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

    expect(screen.getByText("总请求数")).toBeInTheDocument();
    const totalRequestsCard = screen.getByText("总请求数").closest("div")?.parentElement;
    expect(totalRequestsCard).not.toBeNull();
    expect(within(totalRequestsCard as HTMLElement).getByText("100")).toBeInTheDocument();
    expect(screen.getByText("1.00 GB")).toBeInTheDocument();
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
});
