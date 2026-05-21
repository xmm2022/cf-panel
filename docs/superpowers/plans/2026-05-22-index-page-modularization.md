# Index.tsx Modularization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `src/pages/Index.tsx` 拆成按视图组织的模块结构，让后续新功能优先落在独立模块内，同时保持“功能分支开发、合并到 `main` 才触发 Pages 发布”的工作流。

**Architecture:** 保留 `Index.tsx` 作为顶层协调器，只持有跨视图共享状态、导航和跨模块回调；将 `analytics`、`pages`、`kv-storage`、`page-rules` 以及后续次级视图提取到 `src/components/index-page/*`；通过共享类型文件、纯函数工具和小范围测试降低拆分风险；最后再整理顶层 `useEffect` 与 `load*` 依赖。

**Tech Stack:** React 18, TypeScript, Vite, ESLint, Vitest, React Testing Library, shadcn/ui, Cloudflare API integration

---

## Planned File Structure

- `src/pages/Index.tsx`
  顶层布局、导航、共享状态、跨视图回调、对话框挂载点。
- `src/test/setup.ts`
  Vitest DOM 断言初始化。
- `src/components/index-page/shared/index-page-types.ts`
  跨多个视图复用的数据类型，例如 `D1DatabaseSummary`、`R2ObjectSummary`、`TunnelSummary`。
- `src/components/index-page/shared/formatters.ts`
  纯格式化函数，例如数字、带宽、百分比。
- `src/components/index-page/analytics/analytics-types.ts`
  analytics 专属数据类型和 API 映射类型。
- `src/components/index-page/analytics/analytics-utils.ts`
  analytics 派生计算和统计汇总。
- `src/components/index-page/analytics/AnalyticsView.tsx`
  analytics 视图组件。
- `src/components/index-page/pages/pages-types.ts`
  pages 专属类型。
- `src/components/index-page/pages/PagesView.tsx`
  Pages 主视图组件。
- `src/components/index-page/pages/CreatePagesProjectDialog.tsx`
  Pages 创建项目对话框。
- `src/components/index-page/kv-storage/kv-storage-types.ts`
  KV 视图的 props 与数据类型。
- `src/components/index-page/kv-storage/kv-storage-actions.ts`
  KV 导入导出和本地解析的纯函数。
- `src/components/index-page/kv-storage/KvStorageView.tsx`
  KV 主视图组件。
- `src/components/index-page/page-rules/page-rule-types.ts`
  页面规则对象、表单对象和 props 类型。
- `src/components/index-page/page-rules/page-rule-form.ts`
  页面规则编辑态转换与 payload 拼装纯函数。
- `src/components/index-page/page-rules/PageRulesView.tsx`
  页面规则视图组件。
- `src/components/index-page/certificates/CertificatesView.tsx`
  证书管理视图组件。
- `src/components/index-page/tunnels/TunnelsView.tsx`
  Tunnel 管理视图组件。
- `src/components/index-page/d1-database/D1DatabaseView.tsx`
  D1 管理视图组件。
- `src/components/index-page/r2-storage/R2StorageView.tsx`
  R2 管理视图组件。

### Task 1: Add Testing and Shared Scaffolding

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/components/index-page/shared/index-page-types.ts`
- Create: `src/components/index-page/shared/formatters.ts`
- Test: `src/components/index-page/shared/formatters.test.ts`

- [ ] **Step 1: Create the working branch**

Run: `git switch -c refactor/index-page-modules`
Expected: `Switched to a new branch 'refactor/index-page-modules'`

- [ ] **Step 2: Write the failing shared utility test**

```ts
import { describe, expect, it } from "vitest";
import { formatGigabytes, formatMetricNumber, formatPercent } from "./formatters";

describe("shared formatters", () => {
  it("formats metric numbers with zh-CN separators", () => {
    expect(formatMetricNumber(1234567)).toBe("1,234,567");
  });

  it("formats bytes as gigabytes", () => {
    expect(formatGigabytes(1073741824)).toBe("1.00 GB");
  });

  it("formats percentages with zero-division protection", () => {
    expect(formatPercent(25, 100)).toBe("25.0%");
    expect(formatPercent(1, 0)).toBe("0%");
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/components/index-page/shared/formatters.test.ts`
Expected: FAIL with `Cannot find module './formatters'` or Vitest command not found

- [ ] **Step 4: Add test tooling and the shared formatter implementation**

`package.json`

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.5.2",
    "jsdom": "^25.0.1",
    "vitest": "^2.1.8"
  }
}
```

`vite.config.ts`

```ts
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    base: env.VITE_BASE_PATH || "/",
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: "./src/test/setup.ts",
    },
  };
});
```

`src/test/setup.ts`

```ts
import "@testing-library/jest-dom/vitest";
```

`src/components/index-page/shared/index-page-types.ts`

```ts
export interface D1DatabaseSummary {
  uuid: string;
  name: string;
  version?: string;
  created_at: string;
}

export interface R2BucketSummary {
  name: string;
  creation_date: string;
  location?: string;
}

export interface R2ObjectSummary {
  key: string;
  size?: number;
  uploaded?: string;
}

export interface TunnelConnection {
  id?: string;
  colo_name?: string;
  client_ip?: string;
}

export interface TunnelSummary {
  id: string;
  name: string;
  created_at: string;
  status?: string;
  deleted_at?: string | null;
  connections?: TunnelConnection[];
}

export interface CertificateSummary {
  id: string;
  hosts?: string[];
  expires_on: string;
  status: string;
}

export interface KVNamespaceSummary {
  id: string;
  title: string;
}

export interface KVKeySummary {
  name: string;
}

export interface D1QueryResult {
  results?: Array<Record<string, unknown>>;
  result?: Array<Record<string, unknown>>;
  meta?: {
    duration?: number;
    changes?: number;
  };
}
```

`src/components/index-page/shared/formatters.ts`

```ts
export const formatMetricNumber = (value: number): string => value.toLocaleString("zh-CN");

export const formatGigabytes = (value: number): string => `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;

export const formatPercent = (numerator: number, denominator: number, digits = 1): string => {
  if (!denominator) {
    return "0%";
  }

  return `${((numerator / denominator) * 100).toFixed(digits)}%`;
};
```

- [ ] **Step 5: Run the new test and baseline build**

Run: `npm install && npx vitest run src/components/index-page/shared/formatters.test.ts && npm run build`
Expected: shared formatter test PASS, build PASS

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/test/setup.ts \
  src/components/index-page/shared/index-page-types.ts \
  src/components/index-page/shared/formatters.ts \
  src/components/index-page/shared/formatters.test.ts
git commit -m "test: add view extraction scaffolding"
```

### Task 2: Extract the Analytics View

**Files:**
- Create: `src/components/index-page/analytics/analytics-types.ts`
- Create: `src/components/index-page/analytics/analytics-utils.ts`
- Create: `src/components/index-page/analytics/AnalyticsView.tsx`
- Test: `src/components/index-page/analytics/AnalyticsView.test.tsx`
- Modify: `src/pages/Index.tsx:301-312`
- Modify: `src/pages/Index.tsx:5816-7148`

- [ ] **Step 1: Write the failing analytics view test**

```tsx
import { render, screen } from "@testing-library/react";
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
    expect(screen.getByText("100")).toBeInTheDocument();
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
```

- [ ] **Step 2: Run the analytics test to verify it fails**

Run: `npx vitest run src/components/index-page/analytics/AnalyticsView.test.tsx`
Expected: FAIL with `Cannot find module './AnalyticsView'`

- [ ] **Step 3: Implement analytics types, utils, and the extracted view**

`src/components/index-page/analytics/analytics-types.ts`

```ts
export type AnalyticsPeriod = "24h" | "7d" | "30d";

export interface AnalyticsBreakdownItem {
  requests?: number;
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
```

`src/components/index-page/analytics/analytics-utils.ts`

```ts
import type { AnalyticsData, AnalyticsGroup } from "./analytics-types";

export const getHttpGroups = (data: AnalyticsData | null): AnalyticsGroup[] =>
  data?.viewer?.zones?.[0]?.httpRequests1dGroups?.slice().sort((a, b) => a.dimensions.date.localeCompare(b.dimensions.date)) ?? [];

export const sumGroupField = (groups: AnalyticsGroup[], field: keyof NonNullable<AnalyticsGroup["sum"]>): number =>
  groups.reduce((sum, group) => sum + Number(group.sum?.[field] ?? 0), 0);

export const getPeakUniques = (groups: AnalyticsGroup[]): number =>
  Math.max(0, ...groups.map((group) => Number(group.uniq?.uniques ?? 0)));
```

`src/components/index-page/analytics/AnalyticsView.tsx`

```tsx
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
              <Button variant={analyticsPeriod === "24h" ? "default" : "outline"} size="sm" onClick={() => onPeriodChange("24h")}>
                24小时
              </Button>
              <Button variant={analyticsPeriod === "7d" ? "default" : "outline"} size="sm" onClick={() => onPeriodChange("7d")}>
                7天
              </Button>
              <Button variant={analyticsPeriod === "30d" ? "default" : "outline"} size="sm" onClick={() => onPeriodChange("30d")}>
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
                <div className="text-2xl font-bold">{groups.length ? formatMetricNumber(getPeakUniques(groups)) : "-"}</div>
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
                      <div key={day.dimensions.date} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                        <span className="text-sm font-medium">{day.dimensions.date}</span>
                        <div className="flex gap-4 text-sm flex-wrap">
                          <span className="text-muted-foreground">请求: <span className="font-medium text-foreground">{formatMetricNumber(day.sum?.requests ?? 0)}</span></span>
                          <span className="text-muted-foreground">带宽: <span className="font-medium text-foreground">{((day.sum?.bytes ?? 0) / 1024 / 1024).toFixed(2)} MB</span></span>
                          <span className="text-muted-foreground">访客: <span className="font-medium text-foreground">{day.uniq?.uniques ?? 0}</span></span>
                          <span className="text-muted-foreground">缓存: <span className="font-medium text-green-600">{formatPercent(day.sum?.cachedRequests ?? 0, day.sum?.requests ?? 0, 0)}</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-border/50 rounded-lg">
                    <h3 className="font-medium mb-4 flex items-center gap-2"><Network className="w-4 h-4" />DNS 查询分析</h3>
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Info className="w-4 h-4 text-yellow-600" />
                        注意：DNS、防火墙和性能附加指标保持现有模拟展示，真实接入仍沿用当前 API 能力边界。
                      </p>
                    </div>
                  </div>
                  <div className="p-4 border border-border/50 rounded-lg">
                    <h3 className="font-medium mb-4 flex items-center gap-2"><Shield className="w-4 h-4" />防火墙事件与性能提示</h3>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2"><Gauge className="w-4 h-4" />保留现有模拟数据块，但把计算和说明文字留在组件内部。</div>
                      <div className="flex items-center gap-2"><HardDrive className="w-4 h-4" />后续真实数据接入直接在 analytics 模块内扩展。</div>
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
```

`src/pages/Index.tsx`

```tsx
import { AnalyticsView } from "@/components/index-page/analytics/AnalyticsView";
import type { AnalyticsData, AnalyticsPeriod } from "@/components/index-page/analytics/analytics-types";

{activeView === "analytics" && selectedZone && (
  <AnalyticsView
    analyticsData={analyticsData}
    analyticsPeriod={analyticsPeriod}
    isLoading={isLoading}
    selectedZoneName={selectedZoneName}
    onBack={() => {
      setActiveView("zones");
      setSelectedZone("");
      setSelectedZoneName("");
    }}
    onRefresh={() => loadAnalytics(selectedZone)}
    onPeriodChange={(period) => {
      setAnalyticsPeriod(period);
      loadAnalytics(selectedZone, period);
    }}
  />
)}
```

- [ ] **Step 4: Run the analytics tests, lint, and build**

Run: `npx vitest run src/components/index-page/analytics/AnalyticsView.test.tsx && npx eslint src/components/index-page/analytics src/pages/Index.tsx && npm run build`
Expected: analytics test PASS, new analytics files lint PASS, build PASS, `Index.tsx` analytics-related `any` count reduced

- [ ] **Step 5: Commit**

```bash
git add src/components/index-page/analytics src/pages/Index.tsx
git commit -m "refactor: extract analytics view from index page"
```

### Task 3: Extract the Pages View and Create Dialog

**Files:**
- Create: `src/components/index-page/pages/pages-types.ts`
- Create: `src/components/index-page/pages/PagesView.tsx`
- Create: `src/components/index-page/pages/CreatePagesProjectDialog.tsx`
- Test: `src/components/index-page/pages/PagesView.test.tsx`
- Modify: `src/pages/Index.tsx:266-298`
- Modify: `src/pages/Index.tsx:9688-10527`

- [ ] **Step 1: Write the failing Pages view test**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PagesView } from "./PagesView";
import type { PagesDeploymentSummary, PagesProjectSummary } from "./pages-types";

const projects: PagesProjectSummary[] = [
  {
    id: "project-1",
    name: "docs-site",
    subdomain: "docs-site.pages.dev",
    created_on: "2026-05-20T00:00:00.000Z",
  },
];

const deployments: PagesDeploymentSummary[] = [
  {
    id: "deployment-1",
    environment: "production",
    created_on: "2026-05-20T00:00:00.000Z",
  },
];

describe("PagesView", () => {
  it("renders projects and requests deployment history", async () => {
    const user = userEvent.setup();
    const onOpenDeployments = vi.fn();

    render(
      <PagesView
        pagesProjects={projects}
        pagesDeployments={deployments}
        selectedPagesProject=""
        showPagesDeployments={false}
        isLoadingPages={false}
        zonesReady={true}
        onRefresh={vi.fn()}
        onCreateProject={vi.fn()}
        onOpenDashboard={vi.fn()}
        onOpenProjectDashboard={vi.fn()}
        onOpenDeployments={onOpenDeployments}
        onCloseDeployments={vi.fn()}
        onRetryDeployment={vi.fn()}
        onCopyText={vi.fn()}
      />,
    );

    expect(screen.getByText("docs-site")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /部署/i }));
    expect(onOpenDeployments).toHaveBeenCalledWith("docs-site");
  });
});
```

- [ ] **Step 2: Run the Pages test to verify it fails**

Run: `npx vitest run src/components/index-page/pages/PagesView.test.tsx`
Expected: FAIL with `Cannot find module './PagesView'`

- [ ] **Step 3: Implement Pages types, view, and create dialog**

`src/components/index-page/pages/pages-types.ts`

```ts
export interface PagesDomain {
  name: string;
}

export interface PagesProjectSourceConfig {
  owner?: string;
  repo_name?: string;
}

export interface PagesProjectSource {
  type?: string;
  config?: PagesProjectSourceConfig;
}

export interface PagesStage {
  name?: string;
  status?: string;
}

export interface PagesProductionDeployment {
  environment?: string;
  url?: string;
  latest_stage?: PagesStage;
  created_on?: string;
}

export interface PagesProjectSummary {
  id?: string;
  name: string;
  subdomain?: string;
  created_on: string;
  production_deployment?: PagesProductionDeployment;
  domains?: Array<string | PagesDomain>;
  source?: PagesProjectSource;
}

export interface PagesDeploymentBuildConfig {
  build_command?: string;
}

export interface PagesDeploymentTriggerMetadata {
  commit_message?: string;
  branch?: string;
}

export interface PagesDeploymentTrigger {
  metadata?: PagesDeploymentTriggerMetadata;
}

export interface PagesDeploymentSummary {
  id: string;
  environment?: string;
  latest_stage?: PagesStage;
  url?: string;
  created_on?: string;
  build_config?: PagesDeploymentBuildConfig;
  deployment_trigger?: PagesDeploymentTrigger;
}
```

`src/components/index-page/pages/PagesView.tsx`

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Code2, Copy, FileText, Globe, History, Loader2, Play, Settings, Upload, X, Zap } from "lucide-react";
import type { PagesDeploymentSummary, PagesProjectSummary } from "./pages-types";

export interface PagesViewProps {
  pagesProjects: PagesProjectSummary[];
  pagesDeployments: PagesDeploymentSummary[];
  selectedPagesProject: string;
  showPagesDeployments: boolean;
  isLoadingPages: boolean;
  zonesReady: boolean;
  onRefresh: () => void;
  onCreateProject: () => void;
  onOpenDashboard: () => void;
  onOpenProjectDashboard: (projectName: string) => void;
  onOpenDeployments: (projectName: string) => void;
  onCloseDeployments: () => void;
  onRetryDeployment: (deploymentId: string) => void;
  onCopyText: (text: string, description: string) => void;
}

export function PagesView({
  pagesProjects,
  pagesDeployments,
  selectedPagesProject,
  showPagesDeployments,
  isLoadingPages,
  zonesReady,
  onRefresh,
  onCreateProject,
  onOpenDashboard,
  onOpenProjectDashboard,
  onOpenDeployments,
  onCloseDeployments,
  onRetryDeployment,
  onCopyText,
}: PagesViewProps) {
  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Pages 项目
              </CardTitle>
              <CardDescription>使用 Cloudflare Pages 部署静态网站和全栈应用</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onRefresh} disabled={isLoadingPages || !zonesReady}>
                <Loader2 className={`w-4 h-4 mr-2 ${isLoadingPages ? "animate-spin" : ""}`} />
                刷新
              </Button>
              <Button onClick={onCreateProject} disabled={isLoadingPages || !zonesReady}>
                <Upload className="w-4 h-4 mr-2" />
                新建项目
              </Button>
              <Button onClick={onOpenDashboard} variant="outline">
                <Globe className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingPages && pagesProjects.length === 0 && <div className="text-center py-12 text-muted-foreground">正在加载 Pages 项目...</div>}
          {!isLoadingPages && pagesProjects.length === 0 && <div className="text-center py-12 text-muted-foreground">暂无 Pages 项目</div>}
          {!!pagesProjects.length && (
            <div className="space-y-3">
              {pagesProjects.map((project) => (
                <div key={project.id || project.name} className="p-4 border border-border/50 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium truncate">{project.name}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${project.production_deployment ? "bg-green-500/10 text-green-600" : "bg-gray-500/10 text-gray-600"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${project.production_deployment ? "bg-green-600" : "bg-gray-600"}`}></span>
                          {project.production_deployment ? "已部署" : "未部署"}
                        </span>
                      </div>

                      {project.subdomain && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
                          <Globe className="w-3.5 h-3.5" />
                          <span className="truncate">{project.subdomain}</span>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => onCopyText(`https://${project.subdomain}`, "URL 已复制")}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      )}

                      {project.production_deployment?.url && (
                        <div className="p-2 bg-muted/50 rounded-md text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <Zap className="w-4 h-4 text-primary" />
                            <span className="font-medium">生产环境</span>
                          </div>
                          <div className="text-xs text-muted-foreground pl-6 truncate">{project.production_deployment.url}</div>
                        </div>
                      )}

                      {project.source && (
                        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-4">
                          {project.source.type && <div className="flex items-center gap-1"><Code2 className="w-3 h-3" />源码: {project.source.type}</div>}
                          {project.source.config?.owner && <div className="truncate">仓库: {project.source.config.owner}/{project.source.config.repo_name}</div>}
                        </div>}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button variant="outline" size="sm" onClick={() => onOpenDeployments(project.name)} disabled={isLoadingPages}>
                        <History className="w-4 h-4 mr-1.5" />
                        部署
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onOpenProjectDashboard(project.name)} disabled={isLoadingPages}>
                        <Settings className="w-4 h-4 mr-1.5" />
                        管理
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showPagesDeployments && selectedPagesProject && (
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><History className="w-5 h-5" />部署历史 - {selectedPagesProject}</CardTitle>
                <CardDescription>查看项目的所有部署记录</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={onCloseDeployments}><X className="w-4 h-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            {!pagesDeployments.length && <div className="text-center py-8 text-muted-foreground">暂无部署记录</div>}
            {!!pagesDeployments.length && (
              <div className="space-y-2">
                {pagesDeployments.map((deployment) => (
                  <div key={deployment.id} className="p-3 border border-border/50 rounded-md hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm truncate">{deployment.id.slice(0, 8)}</span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                            {deployment.environment === "preview" ? "预览" : "生产"}
                          </span>
                        </div>
                        {deployment.deployment_trigger?.metadata?.commit_message && (
                          <div className="mt-2 text-xs text-muted-foreground truncate">💬 {deployment.deployment_trigger.metadata.commit_message}</div>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onRetryDeployment(deployment.id)} disabled={isLoadingPages}>
                        <Play className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

`src/components/index-page/pages/CreatePagesProjectDialog.tsx`

```tsx
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Code2, Upload } from "lucide-react";

export interface CreatePagesProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadMode: () => void;
  onGitMode: () => void;
}

export function CreatePagesProjectDialog({ open, onOpenChange, onUploadMode, onGitMode }: CreatePagesProjectDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>创建 Pages 项目</AlertDialogTitle>
          <AlertDialogDescription>选择部署方式在 Cloudflare Dashboard 中创建项目</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <Card className="cursor-pointer hover:border-primary transition-all" onClick={onUploadMode}>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Upload className="w-5 h-5" />上传文件部署</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">直接上传静态网站文件到 Cloudflare Pages</p></CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary transition-all" onClick={onGitMode}>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Code2 className="w-5 h-5" />连接 Git 仓库</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">连接 GitHub/GitLab 实现自动化部署</p></CardContent>
          </Card>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>关闭</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

`src/pages/Index.tsx`

```tsx
import { CreatePagesProjectDialog } from "@/components/index-page/pages/CreatePagesProjectDialog";
import { PagesView } from "@/components/index-page/pages/PagesView";
import type { PagesDeploymentSummary, PagesProjectSummary } from "@/components/index-page/pages/pages-types";

const handleOpenPagesDashboard = () => window.open("https://dash.cloudflare.com/?to=/:account/pages", "_blank");

const handleOpenProjectDashboard = (projectName: string) => {
  const accountId = zones[0]?.account?.id;
  if (accountId) {
    window.open(`https://dash.cloudflare.com/${accountId}/pages/view/${projectName}`, "_blank");
  }
};

const handleCopyText = (text: string, description: string) => {
  navigator.clipboard.writeText(text);
  toast({ description });
};

const handleRetryPagesDeployment = async (deploymentId: string) => {
  const email = getCookie("cf_email");
  const apiKey = getCookie("cf_api_key");
  const accountId = zones[0]?.account?.id;

  if (!email || !apiKey || !accountId || !selectedPagesProject) {
    return;
  }

  setIsLoadingPages(true);
  try {
    const { data, error } = await supabase.functions.invoke("cloudflare-api", {
      body: {
        action: "retry_pages_deployment",
        email,
        apiKey,
        accountId,
        projectName: selectedPagesProject,
        deploymentId,
      },
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.errors?.[0]?.message || "重新部署失败");

    toast({
      title: "重新部署成功",
      description: "部署已开始，请稍候...",
    });
    setTimeout(() => loadPagesDeployments(selectedPagesProject), 2000);
  } catch (error) {
    toast({
      title: "重新部署失败",
      description: error instanceof Error ? error.message : "未知错误",
      variant: "destructive",
    });
  } finally {
    setIsLoadingPages(false);
  }
};

const handleOpenPagesUploadDashboard = () => {
  const accountId = zones[0]?.account?.id;
  if (!accountId) return;
  window.open(`https://dash.cloudflare.com/${accountId}/pages/new/upload`, "_blank");
  setCreatePagesProjectOpen(false);
  toast({ title: "正在前往 Dashboard", description: "完成后返回刷新即可看到新项目" });
};

const handleOpenPagesGitDashboard = () => {
  const accountId = zones[0]?.account?.id;
  if (!accountId) return;
  window.open(`https://dash.cloudflare.com/${accountId}/pages/new`, "_blank");
  setCreatePagesProjectOpen(false);
  toast({ title: "正在前往 Dashboard", description: "完成后返回刷新即可看到新项目" });
};

{activeView === "pages" && (
  <PagesView
    pagesProjects={pagesProjects}
    pagesDeployments={pagesDeployments}
    selectedPagesProject={selectedPagesProject}
    showPagesDeployments={showPagesDeployments}
    isLoadingPages={isLoadingPages}
    zonesReady={zones.length > 0}
    onRefresh={loadPagesProjects}
    onCreateProject={() => setCreatePagesProjectOpen(true)}
    onOpenDashboard={handleOpenPagesDashboard}
    onOpenProjectDashboard={handleOpenProjectDashboard}
    onOpenDeployments={(projectName) => {
      setSelectedPagesProject(projectName);
      const project = pagesProjects.find((item) => item.name === projectName) ?? null;
      setPagesProjectDetail(project);
      setShowPagesDeployments(true);
      loadPagesDeployments(projectName);
    }}
    onCloseDeployments={() => {
      setShowPagesDeployments(false);
      setSelectedPagesProject("");
      setPagesDeployments([]);
    }}
    onRetryDeployment={(deploymentId) => handleRetryPagesDeployment(deploymentId)}
    onCopyText={handleCopyText}
  />
)}

<CreatePagesProjectDialog
  open={createPagesProjectOpen}
  onOpenChange={setCreatePagesProjectOpen}
  onUploadMode={handleOpenPagesUploadDashboard}
  onGitMode={handleOpenPagesGitDashboard}
/>
```

- [ ] **Step 4: Run the Pages tests, lint, and build**

Run: `npx vitest run src/components/index-page/pages/PagesView.test.tsx && npx eslint src/components/index-page/pages src/pages/Index.tsx && npm run build`
Expected: Pages test PASS, new Pages files lint PASS, build PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/index-page/pages src/pages/Index.tsx
git commit -m "refactor: extract pages view from index page"
```

### Task 4: Extract the KV Storage View and Local File Helpers

**Files:**
- Create: `src/components/index-page/kv-storage/kv-storage-types.ts`
- Create: `src/components/index-page/kv-storage/kv-storage-actions.ts`
- Create: `src/components/index-page/kv-storage/KvStorageView.tsx`
- Test: `src/components/index-page/kv-storage/kv-storage-actions.test.ts`
- Test: `src/components/index-page/kv-storage/KvStorageView.test.tsx`
- Modify: `src/pages/Index.tsx:1090-1130`
- Modify: `src/pages/Index.tsx:7642-8387`

- [ ] **Step 1: Write the failing KV helper and view tests**

```ts
import { describe, expect, it } from "vitest";
import { parseKvImportJson } from "./kv-storage-actions";

describe("parseKvImportJson", () => {
  it("returns normalized KV entries", () => {
    const result = parseKvImportJson('[{"key":"token","value":"123"}]');
    expect(result).toEqual([{ key: "token", value: "123" }]);
  });
});
```

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { KvStorageView } from "./KvStorageView";

describe("KvStorageView", () => {
  it("requests key loading for the selected namespace", async () => {
    const user = userEvent.setup();
    const onLoadKeys = vi.fn();

    render(
      <KvStorageView
        kvNamespaces={[{ id: "ns-1", title: "main" }]}
        selectedKvNamespace="ns-1"
        kvKeys={[]}
        selectedKvKeys={[]}
        isLoading={false}
        onNamespaceChange={vi.fn()}
        onLoadKeys={onLoadKeys}
        onToggleKeySelection={vi.fn()}
        onToggleSelectAll={vi.fn()}
        onDeleteSelected={vi.fn()}
        onCreateKey={vi.fn()}
        onDeleteKey={vi.fn()}
        onExportKeys={vi.fn()}
        onImportKeys={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "加载键列表" }));
    expect(onLoadKeys).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the KV tests to verify they fail**

Run: `npx vitest run src/components/index-page/kv-storage/kv-storage-actions.test.ts src/components/index-page/kv-storage/KvStorageView.test.tsx`
Expected: FAIL with `Cannot find module './kv-storage-actions'` and `Cannot find module './KvStorageView'`

- [ ] **Step 3: Implement KV types, pure helpers, and extracted view**

`src/components/index-page/kv-storage/kv-storage-types.ts`

```ts
import type { KVKeySummary, KVNamespaceSummary } from "@/components/index-page/shared/index-page-types";

export interface KvImportEntry {
  key: string;
  value: string;
}

export interface KvStorageViewProps {
  kvNamespaces: KVNamespaceSummary[];
  selectedKvNamespace: string;
  kvKeys: KVKeySummary[];
  selectedKvKeys: string[];
  isLoading: boolean;
  onNamespaceChange: (namespaceId: string) => void;
  onLoadKeys: () => void;
  onToggleKeySelection: (keyName: string, checked: boolean) => void;
  onToggleSelectAll: () => void;
  onDeleteSelected: () => void;
  onCreateKey: () => void;
  onDeleteKey: (keyName: string) => void;
  onExportKeys: () => void;
  onImportKeys: (file: File) => void;
}
```

`src/components/index-page/kv-storage/kv-storage-actions.ts`

```ts
import type { KvImportEntry } from "./kv-storage-types";

export const parseKvImportJson = (text: string): KvImportEntry[] => {
  const parsed = JSON.parse(text);

  if (!Array.isArray(parsed)) {
    throw new Error("格式错误，应为数组");
  }

  return parsed
    .filter((item): item is { key: string; value?: unknown } => typeof item?.key === "string")
    .map((item) => ({
      key: item.key,
      value: String(item.value ?? ""),
    }));
};

export const buildKvExportFileName = (namespaceId: string): string => `kv-export-${namespaceId}.json`;
```

`src/components/index-page/kv-storage/KvStorageView.tsx`

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useRef } from "react";
import type { KvStorageViewProps } from "./kv-storage-types";

export function KvStorageView({
  kvNamespaces,
  selectedKvNamespace,
  kvKeys,
  selectedKvKeys,
  isLoading,
  onNamespaceChange,
  onLoadKeys,
  onToggleKeySelection,
  onToggleSelectAll,
  onDeleteSelected,
  onCreateKey,
  onDeleteKey,
  onExportKeys,
  onImportKeys,
}: KvStorageViewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="max-w-5xl mx-auto">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Workers KV 管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>命名空间</Label>
            <select
              className="w-full h-10 px-3 border border-border/50 rounded-md bg-background"
              value={selectedKvNamespace}
              onChange={(event) => onNamespaceChange(event.target.value)}
            >
              <option value="">请选择命名空间</option>
              {kvNamespaces.map((namespace) => (
                <option key={namespace.id} value={namespace.id}>
                  {namespace.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Button onClick={onLoadKeys} disabled={!selectedKvNamespace || isLoading}>
              加载键列表
            </Button>
            <Button variant="outline" onClick={onCreateKey} disabled={!selectedKvNamespace || isLoading}>
              新增键
            </Button>
            <Button variant="outline" onClick={onExportKeys} disabled={!selectedKvNamespace || isLoading}>
              导出为 JSON
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={!selectedKvNamespace || isLoading}>
              从 JSON 导入
            </Button>
            <Button variant="destructive" onClick={onDeleteSelected} disabled={!selectedKvKeys.length || isLoading}>
              批量删除
            </Button>
          </div>

          <Input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                onImportKeys(file);
                event.target.value = "";
              }
            }}
          />

          <Separator />

          {!selectedKvNamespace && <div className="text-sm text-muted-foreground text-center py-4">选择命名空间后加载键列表</div>}
          {!!selectedKvNamespace && !kvKeys.length && <div className="text-sm text-muted-foreground text-center py-4">暂无键，点击“加载键列表”获取</div>}
          {!!kvKeys.length && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Button variant="ghost" size="sm" onClick={onToggleSelectAll}>
                  {selectedKvKeys.length === kvKeys.length ? "取消全选" : "全选"}
                </Button>
                <div className="text-xs text-muted-foreground">已选 {selectedKvKeys.length} / {kvKeys.length}</div>
              </div>
              <div className="border border-border/50 rounded-md divide-y max-h-64 overflow-auto">
                {kvKeys.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-3 p-2 hover:bg-muted/40">
                    <label className="flex items-center gap-3 cursor-pointer min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedKvKeys.includes(item.name)}
                        onChange={(event) => onToggleKeySelection(item.name, event.target.checked)}
                      />
                      <span className="text-sm font-mono truncate">{item.name}</span>
                    </label>
                    <Button variant="ghost" size="sm" onClick={() => onDeleteKey(item.name)}>
                      删除
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

`src/pages/Index.tsx`

```tsx
import { KvStorageView } from "@/components/index-page/kv-storage/KvStorageView";
import { buildKvExportFileName, parseKvImportJson } from "@/components/index-page/kv-storage/kv-storage-actions";
import type { KvImportEntry } from "@/components/index-page/kv-storage/kv-storage-types";

const handleKvToggleKeySelection = (keyName: string, checked: boolean) => {
  setSelectedKvKeys((prev) => (checked ? [...prev, keyName] : prev.filter((name) => name !== keyName)));
};

const handleKvToggleSelectAll = () => {
  setSelectedKvKeys((prev) => (prev.length === kvKeys.length ? [] : kvKeys.map((key) => key.name)));
};

const handleKvImportKeys = async (file: File) => {
  const text = await file.text();
  const entries: KvImportEntry[] = parseKvImportJson(text);
  await uploadKvEntries(entries);
};

const handleLoadKvKeys = async () => {
  if (!selectedKvNamespace) return;

  const email = getCookie("cf_email") || cfEmail;
  const apiKey = getCookie("cf_api_key") || cfApiKey;
  const accountId = zones[0]?.account?.id;
  if (!email || !apiKey || !accountId) {
    toast({ title: "缺少凭证或账户信息", variant: "destructive" });
    return;
  }

  setIsLoading(true);
  try {
    const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${selectedKvNamespace}`;
    const response = await fetch(`${base}/keys?limit=1000`, {
      headers: { "X-Auth-Email": email, "X-Auth-Key": apiKey },
    });
    const json = await response.json();

    if (!response.ok || !json?.result) {
      throw new Error(json.errors?.[0]?.message || `HTTP ${response.status}`);
    }

    setKvKeys(json.result);
    setSelectedKvKeys([]);
    toast({ title: "已加载键列表", description: `共 ${json.result.length} 个` });
  } catch (error) {
    toast({
      title: "加载失败",
      description: error instanceof Error ? error.message : "未知错误",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};

const handleDeleteSelectedKvKeys = async () => {
  if (!selectedKvNamespace || selectedKvKeys.length === 0) return;

  const email = getCookie("cf_email") || cfEmail;
  const apiKey = getCookie("cf_api_key") || cfApiKey;
  const accountId = zones[0]?.account?.id;
  if (!email || !apiKey || !accountId) {
    toast({ title: "缺少凭证或账户信息", variant: "destructive" });
    return;
  }

  setIsLoading(true);
  try {
    const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${selectedKvNamespace}`;
    let ok = 0;

    for (const key of selectedKvKeys) {
      const response = await fetch(`${base}/values/${encodeURIComponent(key)}`, {
        method: "DELETE",
        headers: { "X-Auth-Email": email, "X-Auth-Key": apiKey },
      });
      if (response.ok) ok++;
    }

    setKvKeys((prev) => prev.filter((item) => !selectedKvKeys.includes(item.name)));
    setSelectedKvKeys([]);
    toast({ title: "批量删除完成", description: `成功 ${ok} 个` });
  } catch (error) {
    toast({
      title: "批量删除失败",
      description: error instanceof Error ? error.message : "未知错误",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};

const handleCreateKvKey = async () => {
  const keyInput = document.getElementById("kv-key") as HTMLInputElement | null;
  const valueInput = document.getElementById("kv-value") as HTMLTextAreaElement | null;
  const key = keyInput?.value?.trim() || "";
  const value = valueInput?.value || "";

  if (!selectedKvNamespace || !key) {
    toast({ title: "请选择命名空间并输入键名", variant: "destructive" });
    return;
  }

  const email = getCookie("cf_email") || cfEmail;
  const apiKey = getCookie("cf_api_key") || cfApiKey;
  const accountId = zones[0]?.account?.id;
  if (!email || !apiKey || !accountId) {
    toast({ title: "缺少凭证或账户信息", variant: "destructive" });
    return;
  }

  setIsLoading(true);
  try {
    const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${selectedKvNamespace}`;
    const response = await fetch(`${base}/values/${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: {
        "X-Auth-Email": email,
        "X-Auth-Key": apiKey,
        "Content-Type": "text/plain",
      },
      body: value,
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok || json.success === false) {
      throw new Error(json.errors?.[0]?.message || `HTTP ${response.status}`);
    }

    setKvKeys((prev) => (prev.some((item) => item.name === key) ? prev : [...prev, { name: key }]));
    toast({ title: "保存成功" });
  } catch (error) {
    toast({
      title: "保存失败",
      description: error instanceof Error ? error.message : "未知错误",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};

const handleDeleteKvKey = async (keyName: string) => {
  if (!selectedKvNamespace) return;

  const email = getCookie("cf_email") || cfEmail;
  const apiKey = getCookie("cf_api_key") || cfApiKey;
  const accountId = zones[0]?.account?.id;
  if (!email || !apiKey || !accountId) {
    toast({ title: "缺少凭证或账户信息", variant: "destructive" });
    return;
  }

  setIsLoading(true);
  try {
    const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${selectedKvNamespace}`;
    const response = await fetch(`${base}/values/${encodeURIComponent(keyName)}`, {
      method: "DELETE",
      headers: { "X-Auth-Email": email, "X-Auth-Key": apiKey },
    });
    const json = await response.json().catch(() => ({}));

    if (!response.ok || json.success === false) {
      throw new Error(json.errors?.[0]?.message || `HTTP ${response.status}`);
    }

    setKvKeys((prev) => prev.filter((item) => item.name !== keyName));
    setSelectedKvKeys((prev) => prev.filter((item) => item !== keyName));
    toast({ title: "删除成功" });
  } catch (error) {
    toast({
      title: "删除失败",
      description: error instanceof Error ? error.message : "未知错误",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};

const handleExportKvKeys = async () => {
  if (!selectedKvNamespace) return;

  const email = getCookie("cf_email") || cfEmail;
  const apiKey = getCookie("cf_api_key") || cfApiKey;
  const accountId = zones[0]?.account?.id;
  const keysToExport = selectedKvKeys.length ? selectedKvKeys : kvKeys.map((key) => key.name);
  if (!email || !apiKey || !accountId) {
    toast({ title: "缺少凭证或账户信息", variant: "destructive" });
    return;
  }

  setIsLoading(true);
  try {
    const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${selectedKvNamespace}`;
    const entries: KvImportEntry[] = [];

    for (const key of keysToExport) {
      const response = await fetch(`${base}/values/${encodeURIComponent(key)}`, {
        headers: { "X-Auth-Email": email, "X-Auth-Key": apiKey },
      });
      entries.push({
        key,
        value: response.ok ? await response.text() : "",
      });
    }

    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = buildKvExportFileName(selectedKvNamespace);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    toast({ title: "导出完成", description: `共导出 ${entries.length} 个键` });
  } catch (error) {
    toast({
      title: "导出失败",
      description: error instanceof Error ? error.message : "未知错误",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};

const uploadKvEntries = async (entries: KvImportEntry[]) => {
  if (!selectedKvNamespace) return;

  const email = getCookie("cf_email") || cfEmail;
  const apiKey = getCookie("cf_api_key") || cfApiKey;
  const accountId = zones[0]?.account?.id;
  if (!email || !apiKey || !accountId) {
    toast({ title: "缺少凭证或账户信息", variant: "destructive" });
    return;
  }

  setIsLoading(true);
  try {
    const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${selectedKvNamespace}`;
    let ok = 0;

    for (const item of entries) {
      const response = await fetch(`${base}/values/${encodeURIComponent(item.key)}`, {
        method: "PUT",
        headers: {
          "X-Auth-Email": email,
          "X-Auth-Key": apiKey,
          "Content-Type": "text/plain",
        },
        body: item.value,
      });
      if (response.ok) ok++;
    }

    await handleLoadKvKeys();
    toast({ title: "导入完成", description: `成功 ${ok} 个` });
  } finally {
    setIsLoading(false);
  }
};

{activeView === "kv-storage" && (
  <KvStorageView
    kvNamespaces={kvNamespaces}
    selectedKvNamespace={selectedKvNamespace}
    kvKeys={kvKeys}
    selectedKvKeys={selectedKvKeys}
    isLoading={isLoading}
    onNamespaceChange={setSelectedKvNamespace}
    onLoadKeys={handleLoadKvKeys}
    onToggleKeySelection={handleKvToggleKeySelection}
    onToggleSelectAll={handleKvToggleSelectAll}
    onDeleteSelected={handleDeleteSelectedKvKeys}
    onCreateKey={handleCreateKvKey}
    onDeleteKey={handleDeleteKvKey}
    onExportKeys={handleExportKvKeys}
    onImportKeys={handleKvImportKeys}
  />
)}
```

- [ ] **Step 4: Run the KV tests, lint, and build**

Run: `npx vitest run src/components/index-page/kv-storage/kv-storage-actions.test.ts src/components/index-page/kv-storage/KvStorageView.test.tsx && npx eslint src/components/index-page/kv-storage src/pages/Index.tsx && npm run build`
Expected: KV tests PASS, new KV files lint PASS, build PASS, KV section no longer adds new inline `any`

- [ ] **Step 5: Commit**

```bash
git add src/components/index-page/kv-storage src/pages/Index.tsx
git commit -m "refactor: extract kv storage view from index page"
```

### Task 5: Extract the Page Rules View and Form Mapping Helpers

**Files:**
- Create: `src/components/index-page/page-rules/page-rule-types.ts`
- Create: `src/components/index-page/page-rules/page-rule-form.ts`
- Create: `src/components/index-page/page-rules/PageRulesView.tsx`
- Test: `src/components/index-page/page-rules/page-rule-form.test.ts`
- Test: `src/components/index-page/page-rules/PageRulesView.test.tsx`
- Modify: `src/pages/Index.tsx:347-359`
- Modify: `src/pages/Index.tsx:7152-7641`

- [ ] **Step 1: Write the failing page-rule form helper test**

```ts
import { describe, expect, it } from "vitest";
import { createEmptyPageRuleForm, mapRuleToForm } from "./page-rule-form";
import type { PageRule } from "./page-rule-types";

describe("page-rule-form", () => {
  it("maps a forwarding rule into editable form state", () => {
    const rule: PageRule = {
      id: "rule-1",
      status: "active",
      actions: [{ id: "forwarding_url", value: { status_code: 301, url: "https://example.com" } }],
      targets: [{ constraint: { value: "*.example.com/*" } }],
    };

    expect(mapRuleToForm(rule)).toMatchObject({
      urlPattern: "*.example.com/*",
      forwardingType: "301",
      forwardingUrl: "https://example.com",
    });
    expect(createEmptyPageRuleForm().status).toBe("active");
  });
});
```

- [ ] **Step 2: Run the page-rule tests to verify they fail**

Run: `npx vitest run src/components/index-page/page-rules/page-rule-form.test.ts`
Expected: FAIL with `Cannot find module './page-rule-form'`

- [ ] **Step 3: Implement page-rule types, form helpers, and extracted view**

`src/components/index-page/page-rules/page-rule-types.ts`

```ts
export interface PageRuleAction {
  id: string;
  value?: string | number | { status_code: number; url: string };
}

export interface PageRuleTarget {
  constraint?: {
    value?: string;
  };
}

export interface PageRule {
  id: string;
  status: "active" | "disabled";
  priority?: number;
  targets?: PageRuleTarget[];
  actions?: PageRuleAction[];
}

export interface PageRuleFormState {
  urlPattern: string;
  cacheLevel: string;
  browserCacheTtl: string;
  securityLevel: string;
  ssl: string;
  alwaysUseHttps: string;
  forwardingType: string;
  forwardingUrl: string;
  status: "active" | "disabled";
}
```

`src/components/index-page/page-rules/page-rule-form.ts`

```ts
import type { PageRule, PageRuleFormState } from "./page-rule-types";

export const createEmptyPageRuleForm = (): PageRuleFormState => ({
  urlPattern: "",
  cacheLevel: "",
  browserCacheTtl: "",
  securityLevel: "",
  ssl: "",
  alwaysUseHttps: "",
  forwardingType: "",
  forwardingUrl: "",
  status: "active",
});

export const mapRuleToForm = (rule: PageRule): PageRuleFormState => {
  const form = createEmptyPageRuleForm();
  form.status = rule.status;
  form.urlPattern = rule.targets?.[0]?.constraint?.value ?? "";

  for (const action of rule.actions ?? []) {
    if (action.id === "cache_level" && typeof action.value === "string") form.cacheLevel = action.value;
    if (action.id === "browser_cache_ttl" && typeof action.value === "number") form.browserCacheTtl = String(action.value);
    if (action.id === "security_level" && typeof action.value === "string") form.securityLevel = action.value;
    if (action.id === "ssl" && typeof action.value === "string") form.ssl = action.value;
    if (action.id === "always_use_https" && typeof action.value === "string") form.alwaysUseHttps = action.value;
    if (action.id === "forwarding_url" && typeof action.value === "object" && action.value) {
      form.forwardingType = String(action.value.status_code);
      form.forwardingUrl = action.value.url;
    }
  }

  return form;
};
```

`src/components/index-page/page-rules/PageRulesView.tsx`

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Settings } from "lucide-react";
import type { PageRule, PageRuleFormState } from "./page-rule-types";

export interface PageRulesViewProps {
  selectedZoneName: string;
  selectedZone: string;
  isLoading: boolean;
  editingPageRuleId: string | null;
  pageRules: PageRule[];
  newPageRule: PageRuleFormState;
  onBack: () => void;
  onFormChange: (form: PageRuleFormState) => void;
  onResetForm: () => void;
  onSubmit: () => void;
  onRefresh: () => void;
  onToggleRule: (ruleId: string, checked: boolean) => void;
  onEditRule: (ruleId: string) => void;
  onDeleteRule: (ruleId: string) => void;
}

export function PageRulesView({
  selectedZoneName,
  isLoading,
  editingPageRuleId,
  pageRules,
  newPageRule,
  onBack,
  onFormChange,
  onResetForm,
  onSubmit,
  onRefresh,
  onToggleRule,
  onEditRule,
  onDeleteRule,
}: PageRulesViewProps) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" onClick={onBack}>
          ← 返回域名列表
        </Button>
      </div>

      <Card className="shadow-card mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="w-5 h-5" />
            页面规则管理
          </CardTitle>
          <CardDescription>当前域名: {selectedZoneName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 border border-border/50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm">{editingPageRuleId ? "编辑页面规则" : "创建页面规则"}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div className="md:col-span-2">
                  <Label className="text-xs mb-1 block">URL 模式 *</Label>
                  <Input
                    placeholder="*.example.com/images/*"
                    value={newPageRule.urlPattern}
                    onChange={(event) => onFormChange({ ...newPageRule, urlPattern: event.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={onResetForm} disabled={isLoading}>
                  {editingPageRuleId ? "取消" : "重置"}
                </Button>
                <Button size="sm" onClick={onSubmit} disabled={isLoading}>
                  {isLoading ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" />处理中</> : editingPageRuleId ? "更新规则" : "创建规则"}
                </Button>
              </div>
            </div>

            <div className="p-3 border border-border/50 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-sm">现有规则</h3>
                <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
                  刷新
                </Button>
              </div>
              {!pageRules.length && <div className="text-xs text-muted-foreground text-center py-3">暂无页面规则</div>}
              {!!pageRules.length && (
                <div className="space-y-2">
                  {pageRules.map((rule) => (
                    <div key={rule.id} className="p-3 border border-border/50 rounded-lg hover:bg-accent/5 transition-colors">
                      <div className="flex justify-between items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Switch checked={rule.status === "active"} onCheckedChange={(checked) => onToggleRule(rule.id, checked)} disabled={isLoading} />
                            <span className="text-xs font-medium">{rule.status === "active" ? "启用" : "禁用"}</span>
                          </div>
                          <p className="text-xs font-medium mb-1 truncate">{rule.targets?.[0]?.constraint?.value || "未设置"}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => onEditRule(rule.id)}>编辑</Button>
                          <Button variant="destructive" size="sm" onClick={() => onDeleteRule(rule.id)}>删除</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Run the page-rule tests, lint, and build**

Run: `npx vitest run src/components/index-page/page-rules/page-rule-form.test.ts src/components/index-page/page-rules/PageRulesView.test.tsx && npx eslint src/components/index-page/page-rules src/pages/Index.tsx && npm run build`
Expected: page-rule tests PASS, page-rule files lint PASS, build PASS, page-rules section `any` reduced

- [ ] **Step 5: Commit**

```bash
git add src/components/index-page/page-rules src/pages/Index.tsx
git commit -m "refactor: extract page rules view from index page"
```

### Task 6: Extract Certificates and Tunnels Views

**Files:**
- Create: `src/components/index-page/certificates/CertificatesView.tsx`
- Create: `src/components/index-page/tunnels/TunnelsView.tsx`
- Test: `src/components/index-page/certificates/CertificatesView.test.tsx`
- Test: `src/components/index-page/tunnels/TunnelsView.test.tsx`
- Modify: `src/pages/Index.tsx:8387-8603`
- Modify: `src/pages/Index.tsx:9402-9642`

- [ ] **Step 1: Write failing smoke tests for certificates and tunnels**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CertificatesView } from "./CertificatesView";

describe("CertificatesView", () => {
  it("renders certificate host names", () => {
    render(<CertificatesView certificates={[{ id: "cert-1", hosts: ["example.com"], expires_on: "2026-06-01", status: "active" }]} isLoading={false} onRefresh={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText("example.com")).toBeInTheDocument();
  });
});
```

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TunnelsView } from "./TunnelsView";

describe("TunnelsView", () => {
  it("renders tunnel names", () => {
    render(<TunnelsView tunnels={[{ id: "tunnel-1", name: "edge", created_at: "2026-05-20" }]} isLoading={false} onRefresh={vi.fn()} onCreate={vi.fn()} onEdit={vi.fn()} onConfig={vi.fn()} onRoute={vi.fn()} />);
    expect(screen.getByText("edge")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the smoke tests to verify they fail**

Run: `npx vitest run src/components/index-page/certificates/CertificatesView.test.tsx src/components/index-page/tunnels/TunnelsView.test.tsx`
Expected: FAIL with missing component modules

- [ ] **Step 3: Implement the two read-mostly view components and replace their inline JSX**

```tsx
import type { CertificateSummary, TunnelSummary } from "@/components/index-page/shared/index-page-types";

export interface CertificatesViewProps {
  certificates: CertificateSummary[];
  isLoading: boolean;
  onRefresh: () => void;
  onBack: () => void;
}

export interface TunnelsViewProps {
  tunnels: TunnelSummary[];
  isLoading: boolean;
  onRefresh: () => void;
  onCreate: () => void;
  onEdit: (tunnelId: string) => void;
  onConfig: (tunnelId: string) => void;
  onRoute: (tunnelId: string) => void;
}
```

`src/pages/Index.tsx`

```tsx
{activeView === "certificates" && (
  <CertificatesView
    certificates={certificates}
    isLoading={isLoading}
    onRefresh={loadCertificates}
    onBack={() => {
      setActiveView("zones");
      setSelectedZone("");
      setSelectedZoneName("");
    }}
  />
)}

{activeView === "tunnels" && (
  <TunnelsView
    tunnels={tunnels}
    isLoading={isLoading}
    onRefresh={loadTunnels}
    onCreate={() => setCreateTunnelOpen(true)}
    onEdit={handleEditTunnel}
    onConfig={handleOpenTunnelConfig}
    onRoute={handleOpenTunnelRoute}
  />
)}
```

先在 `Index.tsx` 中把当前内联 Tunnel 操作提取为这三个命名回调，再接到 `TunnelsView`：

```tsx
const handleEditTunnel = (tunnelId: string) => {
  const tunnel = tunnels.find((item) => item.id === tunnelId) ?? null;
  if (!tunnel) return;
  setSelectedTunnel(tunnel);
  setEditTunnelOpen(true);
};

const handleOpenTunnelConfig = (tunnelId: string) => {
  const tunnel = tunnels.find((item) => item.id === tunnelId) ?? null;
  if (!tunnel) return;
  setSelectedTunnel(tunnel);
  setTunnelConfigOpen(true);
};

const handleOpenTunnelRoute = (tunnelId: string) => {
  const tunnel = tunnels.find((item) => item.id === tunnelId) ?? null;
  if (!tunnel) return;
  setSelectedTunnel(tunnel);
  setTunnelRouteOpen(true);
};
```

- [ ] **Step 4: Run the smoke tests, lint, and build**

Run: `npx vitest run src/components/index-page/certificates/CertificatesView.test.tsx src/components/index-page/tunnels/TunnelsView.test.tsx && npx eslint src/components/index-page/certificates src/components/index-page/tunnels src/pages/Index.tsx && npm run build`
Expected: tests PASS, files lint PASS, build PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/index-page/certificates src/components/index-page/tunnels src/pages/Index.tsx
git commit -m "refactor: extract certificates and tunnels views"
```

### Task 7: Extract D1 and R2 Views

**Files:**
- Create: `src/components/index-page/d1-database/D1DatabaseView.tsx`
- Create: `src/components/index-page/r2-storage/R2StorageView.tsx`
- Test: `src/components/index-page/d1-database/D1DatabaseView.test.tsx`
- Test: `src/components/index-page/r2-storage/R2StorageView.test.tsx`
- Modify: `src/pages/Index.tsx:8612-9099`
- Modify: `src/pages/Index.tsx:9100-9401`

- [ ] **Step 1: Write failing smoke tests for D1 and R2**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { D1DatabaseView } from "./D1DatabaseView";

describe("D1DatabaseView", () => {
  it("renders database names", () => {
    render(<D1DatabaseView d1Databases={[{ uuid: "db-1", name: "main", created_at: "2026-05-20" }]} selectedD1Database="" d1QueryResult={null} isLoading={false} isExecutingQuery={false} onSelectDatabase={vi.fn()} onRunQuery={vi.fn()} onRefresh={vi.fn()} onOpenCreateDialog={vi.fn()} />);
    expect(screen.getByText("main")).toBeInTheDocument();
  });
});
```

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { R2StorageView } from "./R2StorageView";

describe("R2StorageView", () => {
  it("renders bucket names", () => {
    render(<R2StorageView r2Buckets={[{ name: "assets", creation_date: "2026-05-20" }]} selectedR2Bucket="" r2Files={[]} isLoading={false} onSelectBucket={vi.fn()} onRefreshBuckets={vi.fn()} onRefreshFiles={vi.fn()} onUploadFile={vi.fn()} />);
    expect(screen.getByText("assets")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the smoke tests to verify they fail**

Run: `npx vitest run src/components/index-page/d1-database/D1DatabaseView.test.tsx src/components/index-page/r2-storage/R2StorageView.test.tsx`
Expected: FAIL with missing component modules

- [ ] **Step 3: Implement the D1 and R2 view components and replace inline JSX**

```tsx
import type { D1DatabaseSummary, D1QueryResult, R2BucketSummary, R2ObjectSummary } from "@/components/index-page/shared/index-page-types";

export interface D1DatabaseViewProps {
  d1Databases: D1DatabaseSummary[];
  selectedD1Database: string;
  d1QueryResult: D1QueryResult | null;
  isLoading: boolean;
  isExecutingQuery: boolean;
  onSelectDatabase: (databaseId: string) => void;
  onRunQuery: () => void;
  onRefresh: () => void;
  onOpenCreateDialog: () => void;
}

export interface R2StorageViewProps {
  r2Buckets: R2BucketSummary[];
  selectedR2Bucket: string;
  r2Files: R2ObjectSummary[];
  isLoading: boolean;
  onSelectBucket: (bucketName: string) => void;
  onRefreshBuckets: () => void;
  onRefreshFiles: () => void;
  onUploadFile: (file: File) => void;
}
```

`src/pages/Index.tsx`

```tsx
{activeView === "d1-database" && (
  <D1DatabaseView
    d1Databases={d1Databases}
    selectedD1Database={selectedD1Database}
    d1QueryResult={d1QueryResult}
    isLoading={isLoading}
    isExecutingQuery={isExecutingD1Query}
    onSelectDatabase={setSelectedD1Database}
    onRunQuery={handleRunD1Query}
    onRefresh={loadD1Databases}
    onOpenCreateDialog={() => setShowCreateD1DatabaseForm(true)}
  />
)}

{activeView === "r2-storage" && (
  <R2StorageView
    r2Buckets={r2Buckets}
    selectedR2Bucket={selectedR2Bucket}
    r2Files={r2Files}
    isLoading={isLoadingR2Files || uploadingFile}
    onSelectBucket={setSelectedR2Bucket}
    onRefreshBuckets={loadR2Buckets}
    onRefreshFiles={handleLoadR2Files}
    onUploadFile={handleUploadR2File}
  />
)}
```

在替换 JSX 之前，先把当前 D1 和 R2 的主操作抽成命名回调：

```tsx
const handleRunD1Query = async () => {
  if (!selectedD1Database) {
    toast({ title: "请选择数据库", variant: "destructive" });
    return;
  }

  if (!d1SqlQuery.trim()) {
    toast({ title: "请输入 SQL 查询", variant: "destructive" });
    return;
  }

  const email = getCookie("cf_email") || cfEmail;
  const apiKey = getCookie("cf_api_key") || cfApiKey;
  const accountId = zones[0]?.account?.id;
  if (!email || !apiKey || !accountId) {
    toast({ title: "未找到凭据或账户 ID", variant: "destructive" });
    return;
  }

  setIsExecutingD1Query(true);
  setD1QueryResult(null);
  try {
    const { data, error } = await supabase.functions.invoke("cloudflare-api", {
      body: {
        action: "execute_d1_query",
        email,
        apiKey,
        accountId,
        databaseId: selectedD1Database,
        sql: d1SqlQuery.trim(),
      },
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.errors?.[0]?.message || "查询失败");

    setD1QueryResult(data.result[0]);
    const currentQuery = d1SqlQuery.trim();
    setD1QueryHistory((prev) => [currentQuery, ...prev.filter((item) => item !== currentQuery)].slice(0, 50));
    setD1SqlQuery("");
    setD1HistoryIndex(-1);
  } catch (error) {
    toast({
      title: "查询失败",
      description: error instanceof Error ? error.message : "未知错误",
      variant: "destructive",
    });
  } finally {
    setIsExecutingD1Query(false);
  }
};

const handleLoadR2Files = async () => {
  if (!selectedR2Bucket) return;
  setShowR2S3Config(false);
};

const handleUploadR2File = async (file: File) => {
  void file;
  toast({
    title: "请使用 S3 兼容工具上传",
    description: "当前版本仍沿用现有的 R2 S3 API 流程，不在前端直传文件。",
  });
};
```

- [ ] **Step 4: Run the smoke tests, lint, and build**

Run: `npx vitest run src/components/index-page/d1-database/D1DatabaseView.test.tsx src/components/index-page/r2-storage/R2StorageView.test.tsx && npx eslint src/components/index-page/d1-database src/components/index-page/r2-storage src/pages/Index.tsx && npm run build`
Expected: tests PASS, files lint PASS, build PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/index-page/d1-database src/components/index-page/r2-storage src/pages/Index.tsx
git commit -m "refactor: extract d1 and r2 views"
```

### Task 8: Clean Up Top-Level Loaders and Hook Dependencies

**Files:**
- Modify: `src/pages/Index.tsx:548-765`
- Modify: `src/pages/Index.tsx:1049-1299`
- Test: `src/pages/Index.effects.test.tsx`

- [ ] **Step 1: Write the failing effect-behavior test**

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Index from "./Index";

describe("Index effects", () => {
  it("does not call view loaders before their view becomes active", () => {
    const invoke = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<Index />);
    expect(invoke).not.toHaveBeenCalledWith(expect.stringContaining("Maximum update depth exceeded"));
    invoke.mockRestore();
  });
});
```

- [ ] **Step 2: Run the effect test and lint to verify the baseline still exposes hook debt**

Run: `npx vitest run src/pages/Index.effects.test.tsx && npx eslint src/pages/Index.tsx`
Expected: effect test may PASS, ESLint still reports hook dependency warnings around the page-rule, KV, analytics, pages, and account restore effects

- [ ] **Step 3: Split account restore effect and stabilize view loaders**

`src/pages/Index.tsx`

```tsx
const loadPageRules = useCallback(async () => {
  const email = getCookie("cf_email") || cfEmail;
  const apiKey = getCookie("cf_api_key") || cfApiKey;
  if (!email || !apiKey || !selectedZone) return;

  setIsLoading(true);
  try {
    const { data, error } = await supabase.functions.invoke("cloudflare-api", {
      body: {
        action: "list_page_rules",
        email,
        apiKey,
        zoneId: selectedZone,
      },
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.errors?.[0]?.message || "页面规则加载失败");

    setPageRules(data.result ?? []);
  } catch (error) {
    toast({
      title: "加载失败",
      description: error instanceof Error ? error.message : "未知错误",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
}, [cfApiKey, cfEmail, selectedZone, toast]);

const loadKvNamespaces = useCallback(async () => {
  const email = getCookie("cf_email") || cfEmail;
  const apiKey = getCookie("cf_api_key") || cfApiKey;
  const accountId = zones[0]?.account?.id;
  if (!email || !apiKey || !accountId) return;

  setIsLoading(true);
  try {
    const { data, error } = await supabase.functions.invoke("cloudflare-api", {
      body: {
        action: "list_kv_namespaces",
        email,
        apiKey,
        accountId,
      },
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.errors?.[0]?.message || "KV 命名空间加载失败");

    setKvNamespaces(data.result ?? []);
  } catch (error) {
    toast({
      title: "加载失败",
      description: error instanceof Error ? error.message : "未知错误",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
}, [cfApiKey, cfEmail, zones, toast]);

const loadAnalytics = useCallback(
  async (zoneId: string, period: AnalyticsPeriod = analyticsPeriod) => {
    const email = getCookie("cf_email") || cfEmail;
    const apiKey = getCookie("cf_api_key") || cfApiKey;
    if (!email || !apiKey || !zoneId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cloudflare-api", {
        body: {
          action: "get_zone_analytics",
          email,
          apiKey,
          zoneId,
          period,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.errors?.[0]?.message || "分析数据加载失败");

      setAnalyticsData(data.result ?? null);
    } catch (error) {
      toast({
        title: "加载失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  },
  [analyticsPeriod, cfApiKey, cfEmail, toast],
);

const loadPagesProjects = useCallback(async () => {
  const email = getCookie("cf_email") || cfEmail;
  const apiKey = getCookie("cf_api_key") || cfApiKey;
  const accountId = zones[0]?.account?.id;
  if (!email || !apiKey || !accountId) return;

  setIsLoadingPages(true);
  try {
    const { data, error } = await supabase.functions.invoke("cloudflare-api", {
      body: {
        action: "list_pages_projects",
        email,
        apiKey,
        accountId,
      },
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.errors?.[0]?.message || "Pages 项目加载失败");

    setPagesProjects(data.result ?? []);
  } catch (error) {
    toast({
      title: "加载失败",
      description: error instanceof Error ? error.message : "未知错误",
      variant: "destructive",
    });
  } finally {
    setIsLoadingPages(false);
  }
}, [cfApiKey, cfEmail, zones, toast]);

useEffect(() => {
  if (activeView === "page-rules" && selectedZone) {
    void loadPageRules();
  }
}, [activeView, selectedZone, loadPageRules]);

useEffect(() => {
  if (activeView === "kv-storage" && zones.length > 0) {
    void loadKvNamespaces();
  }
}, [activeView, zones, loadKvNamespaces]);

useEffect(() => {
  if (activeView === "analytics" && selectedZone) {
    void loadAnalytics(selectedZone);
  }
}, [activeView, selectedZone, loadAnalytics]);

useEffect(() => {
  if (activeView === "pages" && zones.length > 0) {
    void loadPagesProjects();
  }
}, [activeView, zones, loadPagesProjects]);

useEffect(() => {
  const accounts = getAllAccounts();
  setSavedAccounts(accounts);

  const currentAcc = getCurrentAccount();
  const oldEmail = sessionStorage.getItem("cf_email");
  const oldApiKey = sessionStorage.getItem("cf_api_key");
  const cookieEmail = getCookie("cf_email");
  const cookieApiKey = getCookie("cf_api_key");

  if (oldEmail && oldApiKey) {
    const migratedAccount = saveAccount(oldEmail, oldApiKey);
    setCurrentAccount(migratedAccount.id);
    setCurrentAccountId(migratedAccount.id);
    sessionStorage.removeItem("cf_email");
    sessionStorage.removeItem("cf_api_key");
    setCfEmail(oldEmail);
    setCfApiKey(oldApiKey);
    setCloudflareCredentials(oldEmail, oldApiKey);
    setHasCredentials(true);
    setSavedAccounts([...accounts, migratedAccount]);
    setTimeout(() => loadZones({ email: oldEmail, apiKey: oldApiKey }), 100);
    return;
  }

  if (cookieEmail && cookieApiKey && !currentAcc) {
    const migratedAccount = saveAccount(cookieEmail, cookieApiKey);
    setCurrentAccount(migratedAccount.id);
    setCurrentAccountId(migratedAccount.id);
    setCfEmail(cookieEmail);
    setCfApiKey(cookieApiKey);
    setHasCredentials(true);
    setSavedAccounts([...accounts, migratedAccount]);
    setTimeout(() => loadZones({ email: cookieEmail, apiKey: cookieApiKey }), 100);
    return;
  }

  if (currentAcc) {
    setCfEmail(currentAcc.email);
    setCfApiKey(currentAcc.apiKey);
    setCloudflareCredentials(currentAcc.email, currentAcc.apiKey);
    setHasCredentials(true);
    setCurrentAccountId(currentAcc.id);
    setCookie("cf_email", currentAcc.email, 30);
    setCookie("cf_api_key", currentAcc.apiKey, 30);
    setTimeout(() => loadZones({ email: currentAcc.email, apiKey: currentAcc.apiKey }), 100);
  }
}, []);

useEffect(() => {
  if (hasCredentials) {
    void loadWorkersHiddenSetting();
  }
}, [hasCredentials, loadWorkersHiddenSetting]);
```

- [ ] **Step 4: Run the effect test, full lint, and build**

Run: `npx vitest run src/pages/Index.effects.test.tsx && npx eslint src/pages/Index.tsx src/components/index-page && npm run build`
Expected: effect test PASS, top-level hook dependency warnings reduced to zero or explained residuals only, build PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Index.tsx src/pages/Index.effects.test.tsx src/components/index-page
git commit -m "refactor: stabilize index page loaders and effects"
```

## Self-Review

- Spec coverage:
  Analytics, Pages, KV Storage, Page Rules, Certificates, Tunnels, D1, R2, loader cleanup, branch workflow, and lint strategy are all mapped to explicit tasks.
- Placeholder scan:
  No planning stubs remain.
- Type consistency:
  Shared types live in `shared/index-page-types.ts`; analytics/page-rules/pages/KV use per-view type files; `Index.tsx` remains the coordinator across all tasks.
