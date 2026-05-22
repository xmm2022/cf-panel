# Multi-Cloud Panel: EdgeOne Integration Design

> **Status:** Draft — pending review
> **Date:** 2026-05-22
> **Topic:** 在 cf-panel 内引入 provider 抽象层，先接入腾讯云 EdgeOne，后续可扩展至阿里云 ESA。

## Goal

把 `cf-panel` 升级为支持多个边缘云 provider 的统一管理面板。Cloudflare 退居为第一个 provider，EdgeOne 作为第二个 provider 接入，验证抽象层；阿里云 ESA 在 EdgeOne 稳定后按相同模式接入。

## Non-Goals

- 不为商业化 / 多租户做架构准备。
- 不在 MVP 实现 EdgeOne 独有能力（Bot Manager、L4 代理、智能加速等），架构预留接口即可。
- 不引入 monorepo 工具链。
- 不重写 Cloudflare 部分的业务逻辑 —— 现有 loader 被 provider 适配器包一层，行为保持等价。
- 不引入端到端真请求测试，避免消耗腾讯云 API 配额。

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                       Browser (React)                        │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ ProviderSwitcher (顶部)   Account Switcher (顶部)        │ │
│  ├─────────────────┬───────────────────────────────────────┤ │
│  │ Sidebar         │ View 区域                             │ │
│  │ (能力驱动菜单)   │ (provider-agnostic; 接统一 model)    │ │
│  └─────────────────┴───────────────────────────────────────┘ │
│                              │                                │
│                  src/lib/providers/registry                   │
│                  ┌──────────┴───────────┐                     │
│              CloudflareProvider     EdgeOneProvider           │
│              (capabilities: 10)     (capabilities: 6)         │
│                              │                                │
│              统一 X-Provider-Auth header                      │
└──────────────────────────────┼────────────────────────────────┘
                               ▼
              ┌────────────────────────────────┐
              │  cf-panel Worker (现 2632 行)  │
              │  ┌──────────────────────────┐  │
              │  │ /api/cloudflare-api      │  │
              │  │ /api/edgeone-api  (新)   │  │
              │  └──────────────────────────┘  │
              └───────┬────────────────┬───────┘
                      ▼                ▼
              api.cloudflare.com    teo.tencentcloudapi.com
                                    (TC3-HMAC-SHA256 签名)
```

## Provider Abstraction Layer

新增 `src/lib/providers/`。

### 类型契约

```ts
// providers/types.ts —— 跨 provider 统一数据模型
export type ProviderId = "cloudflare" | "edgeone" | "esa";

export interface Zone {
  id: string;
  name: string;
  status: string;
  provider: ProviderId;
  raw?: unknown; // Provider 内部 normalize 时填，view 严禁读取，仅供 console 调试
}

export interface DnsRecord {
  id: string;
  zoneId: string;
  type: string;       // A / AAAA / CNAME / TXT / MX ...
  name: string;
  content: string;
  ttl: number;
  proxied?: boolean;  // CF 独有，EdgeOne 总是 false
}

export interface KvNamespace { id: string; title: string; }
export interface KvKey { name: string; }
export interface WorkerScript { id: string; modifiedOn: string; }
export interface Certificate { id: string; hosts: string[]; expiresOn: string; status: string; }
export interface PageRule {
  id: string;
  zoneId: string;
  status: "active" | "disabled";
  priority?: number;
  // 规则的具体 payload 在 provider 内部仍按自家结构存，view 主要展示 + 编辑
  rawTargets: unknown;
  rawActions: unknown;
}
```

### 能力接口（按能力拆开）

```ts
// providers/capabilities/zones.ts
export interface ZonesCapability {
  list(creds: ProviderCredentials): Promise<Zone[]>;
  create(creds: ProviderCredentials, name: string): Promise<Zone>;
  delete(creds: ProviderCredentials, zoneId: string): Promise<void>;
}

// providers/capabilities/dns.ts
export interface DnsCapability {
  list(creds: ProviderCredentials, zoneId: string): Promise<DnsRecord[]>;
  create(creds: ProviderCredentials, zoneId: string, record: Omit<DnsRecord, "id">): Promise<DnsRecord>;
  update(creds: ProviderCredentials, zoneId: string, record: DnsRecord): Promise<DnsRecord>;
  delete(creds: ProviderCredentials, zoneId: string, recordId: string): Promise<void>;
}

// 同理：KvCapability / WorkersCapability / PageRulesCapability /
//      CertificatesCapability / AnalyticsCapability / PagesCapability /
//      R2Capability / D1Capability / TunnelsCapability
```

### Provider 注册表

```ts
// providers/provider.ts
export interface CloudProvider {
  id: ProviderId;
  label: string;
  capabilities: {
    zones?: ZonesCapability;
    dns?: DnsCapability;
    pageRules?: PageRulesCapability;
    workers?: WorkersCapability;
    kv?: KvCapability;
    certificates?: CertificatesCapability;
    analytics?: AnalyticsCapability;
    // CF only
    pages?: PagesCapability;
    r2?: R2Capability;
    d1?: D1Capability;
    tunnels?: TunnelsCapability;
    // EdgeOne 独有（架构预留，MVP 不实现）
    botManager?: BotManagerCapability;
    l4Proxy?: L4ProxyCapability;
  };
}

// providers/registry.ts
export const providers: Record<ProviderId, CloudProvider> = {
  cloudflare: cloudflareProvider,
  edgeone: edgeoneProvider,
  esa: esaProvider, // P5 阶段再补
};
```

**为何按能力拆**：每个 capability 用自己的 interface 定义，view 只依赖能力 interface 不依赖 provider，未来加新 provider 不需要碰 view。

## Credentials & Account Model

### Schema 变更

```ts
// 现状（src/lib/account-storage.ts）
interface Account { id: string; email: string; apiKey: string; label?: string; }

// 改造后
export type ProviderCredentials =
  | { provider: "cloudflare"; email: string; apiKey: string }
  | { provider: "edgeone";    secretId: string; secretKey: string }
  | { provider: "esa";        accessKeyId: string; accessKeySecret: string };

export interface Account {
  id: string;
  provider: ProviderId;
  label: string;       // 用户起名："公司 CF" / "个人 EdgeOne"
  credentials: ProviderCredentials;
}
```

### 迁移

LocalStorage 主键 `cf_accounts` 升级 schema 版本号字段 `schemaVersion: 2`。读到旧版（无 version 或 version=1）时一次性把所有账号包成 `{ provider: "cloudflare", credentials: { provider: "cloudflare", email, apiKey } }`。

### Cookie 兼容

`cf_email` / `cf_api_key` 老 cookie 仍读但不再写。新代码统一从 `getCurrentAccount()` 拿凭据。

### ProviderSwitcher 行为

- 切换 provider → 仅显示该 provider 下的账号；如该 provider 一个账号都没有，弹出"添加账号"表单（针对该 provider 字段不同）。
- 切换 provider → 重置 view-local state（selectedZone / selectedKvNamespace 等）。
- URL 同步 `?provider=edgeone` 便于书签。

## Worker Backend (EdgeOne)

### 路由扩展

现 Worker 是 action 分发模式。新增 `/api/edgeone-api` 路由，结构与 `/api/cloudflare-api` 平行。

```js
// cloudflare-worker-complete.js
async function handleTencentEdgeOneAPI(request, env, corsHeaders) {
  const { action, ...payload } = await request.json();
  const auth = parseProviderAuth(request.headers.get("X-Provider-Auth"));
  // auth.provider === "edgeone"; auth.secretId; auth.secretKey
  return callEdgeOneAPI(action, payload, auth);
}
```

### TC3-HMAC-SHA256 签名

新文件 `worker/edgeone-signer.js`（纯函数，无外部依赖，用 Worker 环境的 `crypto.subtle`）。

输入：
```ts
sign({
  secretId, secretKey,
  service: "teo",
  action: "DescribeZones",
  payload: { Limit: 100, Offset: 0 },
  region: "ap-guangzhou",
  timestamp: Math.floor(Date.now() / 1000),
})
```

输出：用于 `Authorization` header 的完整字符串 + `X-TC-Timestamp` / `X-TC-Action` / `X-TC-Version` / `X-TC-Region`。

### 统一鉴权头

`X-Provider-Auth` header 格式：

```
X-Provider-Auth: <provider> <k=v>[;<k=v>...]

# 示例
X-Provider-Auth: cloudflare email=user%40example.com;key=abc123
X-Provider-Auth: edgeone secretId=AKID...;secretKey=...
```

**ABNF / 解析规则：**
- provider token 与字段段之间用单个空格分隔；
- 字段段内多个 `k=v` 用 `;` 分隔；
- 所有 value **必须 URL-encoded**（`encodeURIComponent`），从而无歧义地承载 `;` / `=` / 空格 / 中文等字符；
- Worker 端 parser 一次 split + decodeURIComponent，绑定到 schema 校验。

CF 现有调用渐进迁移：`src/lib/cloudflare-worker-api.ts` 加新 wrapper `invokeProviderApi(providerId, action, payload)`，它从 `getCurrentAccount()` 取凭据并生成 header；老 `invokeWorkerApi` 暂保留向后兼容，所有 view 改用新 wrapper 时同步迁移。**退出条件：P4 完成时删除 `invokeWorkerApi`，所有调用点统一走 `invokeProviderApi`**。

### 凭据安全

- Worker 不持久化 secret。
- D1 `operation_history` 表（**现有表，无 schema 变更**）仅记录操作类型 + 资源 ID。
- Worker 日志不打 secret 字符串（统一一个 redactCreds 工具）。

## UI Topology

### 顶部

```
┌────────────────────────────────────────────────────────────┐
│ Multi-Cloud Panel │ Provider: [CF][EdgeOne]  Account: ▾   │
├──────┬─────────────────────────────────────────────────────┤
│ 域名 │                                                     │
│ DNS  │            <Provider-agnostic View>                 │
│ 规则 │                                                     │
│ ...  │                                                     │
```

### 侧边栏菜单（能力驱动）

```ts
const CAPABILITY_TO_MENU: Record<keyof CloudProvider["capabilities"], MenuItem> = {
  zones: { key: "zones", label: "域名", icon: Globe },
  dns: { key: "dns", label: "DNS", icon: Server },
  pageRules: { key: "page-rules", label: "页面规则", icon: Settings },
  // ...
};

const sidebarItems = (Object.keys(providers[activeProviderId].capabilities) as Array<keyof CloudProvider["capabilities"]>)
  .filter((key) => providers[activeProviderId].capabilities[key])
  .map((key) => CAPABILITY_TO_MENU[key]);
```

CF 显示 10 项，EdgeOne MVP 显示 6 项（zones / dns / pageRules / workers / kv / certificates）。

### View 层

每个已抽出 / 待抽出的 View（`AnalyticsView` / `PagesView` / `KvStorageView` 等）接的还是统一 model（`Zone[]`、`KvNamespace[]`），**不感知 provider**。

Index.tsx 顶层 loader 改成：

```tsx
const provider = providers[activeProviderId];
const loadZones = async () => {
  if (!provider.capabilities.zones) return;
  const zones = await provider.capabilities.zones.list(currentAccount.credentials);
  setZones(zones);
};
```

## EdgeOne MVP Scope

只接入共同能力，独有能力架构预留不实现。

| 能力 | EdgeOne 对应 API | 备注 |
|---|---|---|
| zones | `DescribeZones` / `CreateZone` / `DeleteZone` | |
| dns | `DescribeDnsRecords` / `CreateDnsRecord` / `ModifyDnsRecord` / `DeleteDnsRecord` | |
| pageRules | `DescribeRules` / `CreateRule` / `ModifyRule` / `DeleteRule` | EdgeOne 的"规则引擎"概念比 CF Page Rules 复杂，view 先做最小映射 |
| workers | `DescribeEdgeFunctions` / `CreateEdgeFunction` / ... | EdgeOne Workers 全称 Edge Functions |
| kv | `DescribeKvNamespaces` / ... | |
| certificates | `DescribeHostsCertificate` / `ModifyHostsCertificate` | |
| analytics | `DescribeOverviewL7Data` / `DescribeTimingL7AnalysisData` | 只展示曲线 + 总览 |

## Migration Strategy

记忆里"Plan Task 5-7 视图都比 KV 小、建议遇扩展再抽"的判断在引入 provider 后变了 — EdgeOne 接入就是那个"扩展点"。新工作顺序：

1. **P0 底盘** — `providers/` 类型与 capability interfaces + Cloudflare provider 包装现有 loader + Worker `X-Provider-Auth` header 兼容层 + Account schema 迁移。
2. **P1 UI 抬层** — Account 模型升级 + ProviderSwitcher + 侧边栏动态菜单。此时 CF 是唯一 provider，行为等价于现状。Plan Task 8（顶层 loader 整理）顺势完成。
3. **P2 EdgeOne 最薄切片** — Worker TC3 签名 + edgeone provider + zones/DNS 双跑通，验证整条链路。
4. **P3 EdgeOne 能力补齐 + Index.tsx 视图抽取（交错完成）** — 顺序：每加一个 EdgeOne 能力，先抽出对应的 CF view（如果还未抽），让它走 provider-agnostic props，然后实现 EdgeOne 的同名 capability。具体顺序：KV（已抽）→ Workers（需先抽）→ Page Rules（需先抽，对应原 Plan Task 5）→ Certificates（需先抽，对应原 Plan Task 6 一半）→ Analytics（已抽）。
5. **P4 收尾** — 抽出 Tunnels（对应原 Plan Task 6 另一半，CF only）、D1、R2（对应原 Plan Task 7，CF only），统一切到 `invokeProviderApi`；删除 `invokeWorkerApi`；清理 schema v1 兼容代码。

**交错原则**：每个能力的 CF view 抽取与 EdgeOne 实现在同一对 commit 里完成，避免 view 在两个方向上同时变。

预计 14-17 commit 在分支 `feat/multicloud-edgeone`。

## Error Handling

Provider 实现内 normalize 错误，所有 capability method 抛出统一 `ProviderError`：

```ts
export type ProviderErrorCode =
  | "AUTH_INVALID"      // 凭据无效或过期，引导重新填
  | "QUOTA_EXCEEDED"    // API 配额超限
  | "SIGNING_FAILED"    // Worker 端签名生成失败（编程错误）
  | "NOT_FOUND"         // 资源不存在
  | "UNKNOWN";          // 其他（含上游 5xx）

export class ProviderError extends Error {
  constructor(
    public provider: ProviderId,
    public code: ProviderErrorCode,
    public message: string,
    public upstreamCode?: string,  // 透传上游错误码（如 CF "10000" / TC "AuthFailure.SignatureFailure"）
    public raw?: unknown,
  ) { super(message); }
}
```

- View 层用现有 toast 显示 `${provider.label}: ${error.message}`。
- `code === "AUTH_INVALID"` 时额外触发"打开账号管理"引导。

## Testing Strategy

- **Provider 实现单测** — 每个 capability method 一个 vitest，mock Worker fetch 或纯 normalize 函数。
- **TC3 签名单测** — `worker/edgeone-signer.test.js` 用腾讯云官方文档示例 payload 做黄金值对照。
- **集成层 smoke** — ProviderSwitcher 切换后 view loader 调用方向正确，既有 view test 加 provider mock。
- **不写端到端真请求测试** — EdgeOne 真请求走手测。

## Risks & Open Questions

- **EdgeOne 规则引擎 API 复杂度未知** — MVP 先做最小可视 + 编辑能力，复杂规则降级为"在 EdgeOne console 打开"链接。需要在 P3 实施前再做一次小 spike。
- **EdgeOne Workers 部署是否支持 KV binding 等高级配置** — 待 P3 验证；MVP 不支持也可接受。
- **凭据传输从 body 切到 header** — 老 CF 调用需逐个迁移；如果迁移时间窗口长，header / body 两路并存的代码会拖一段时间。
- **EdgeOne API 出口** — cf-panel 现 Worker 部署在 CF，调腾讯云 API 是 CF → 腾讯云的跨境跳转，未来如果不稳可考虑加可选 EdgeOne Worker 作为镜像后端。

## Self-Review

- ✅ Provider 抽象走能力接口拆分，避免 if-else 进 view。
- ✅ Account 模型 schema v2 + 一次性迁移，老 cookie 仅读不写。
- ✅ Worker 鉴权统一 `X-Provider-Auth` header，CF 渐进迁移。
- ✅ UI 顶部 ProviderSwitcher + 共享侧边栏 + 能力驱动菜单。
- ✅ EdgeOne MVP 6 能力 + 独有能力架构预留。
- ✅ 顺序与 Index.tsx 剩余模块化合并。
