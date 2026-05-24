import type { CloudProvider, CloudProviderCapabilities } from "@/lib/providers/provider";
import type { ProviderId } from "@/lib/providers/types";

type CapabilityName = keyof CloudProviderCapabilities;

export type CapabilitySidebarKey =
  | "zones"
  | "dns"
  | "page-rules"
  | "workers"
  | "kv"
  | "certificates"
  | "analytics"
  | "pages"
  | "r2"
  | "d1"
  | "tunnels";

export type CapabilitySidebarView =
  | "zones"
  | "dns"
  | "page-rules"
  | "workers"
  | "kv-storage"
  | "certificates"
  | "analytics"
  | "pages"
  | "r2-storage"
  | "d1-database"
  | "tunnels";

export type CapabilitySidebarScope = "global" | "zone";

export interface SidebarItem {
  key: CapabilitySidebarKey;
  label: string;
  capability: CapabilityName;
  view: CapabilitySidebarView;
  scope: CapabilitySidebarScope;
}

type SidebarItemDefinition = SidebarItem & {
  labels?: Partial<Record<ProviderId, string>>;
  scopes?: Partial<Record<ProviderId, CapabilitySidebarScope>>;
};

const MENU: SidebarItemDefinition[] = [
  { key: "zones", label: "域名管理", capability: "zones", view: "zones", scope: "global" },
  { key: "dns", label: "DNS 记录", capability: "dns", view: "dns", scope: "zone" },
  { key: "page-rules", label: "页面规则", capability: "pageRules", view: "page-rules", scope: "zone" },
  { key: "workers", label: "Workers", capability: "workers", view: "workers", scope: "global" },
  {
    key: "kv",
    label: "Workers KV",
    labels: { edgeone: "EdgeOne KV" },
    scopes: { edgeone: "zone" },
    capability: "kv",
    view: "kv-storage",
    scope: "global",
  },
  { key: "certificates", label: "证书管理", capability: "certificates", view: "certificates", scope: "zone" },
  { key: "analytics", label: "统计分析", capability: "analytics", view: "analytics", scope: "zone" },
  { key: "pages", label: "Pages", capability: "pages", view: "pages", scope: "global" },
  { key: "r2", label: "R2 存储桶", capability: "r2", view: "r2-storage", scope: "global" },
  { key: "d1", label: "D1 数据库", capability: "d1", view: "d1-database", scope: "global" },
  { key: "tunnels", label: "Cloudflare Tunnels", capability: "tunnels", view: "tunnels", scope: "global" },
];

export function buildSidebarItems(
  active: ProviderId,
  providerRegistry: Record<ProviderId, CloudProvider>,
): SidebarItem[] {
  const capabilities = providerRegistry[active].capabilities;
  return MENU.filter((item) => capabilities[item.capability] !== undefined).map(
    ({ labels, scopes, ...item }) => ({
      ...item,
      label: labels?.[active] ?? item.label,
      scope: scopes?.[active] ?? item.scope,
    }),
  );
}
