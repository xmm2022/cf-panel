import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase-adapter";
import { useToast } from "@/hooks/use-toast";
import { getCookie, setCookie } from "@/lib/cookies";
import { clearCloudflareCredentials } from "@/lib/cloudflare-credentials";
import {
  CloudflareAccount,
  getAllAccounts,
  getCurrentAccount,
  saveAccount,
  setCurrentAccount,
  deleteAccount,
} from "@/lib/accounts-storage";
import { recordOperation } from "@/lib/operation-logger";
import { invokeProviderApi } from "@/lib/cloudflare-worker-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Cloud,
  Zap,
  Shield,
  Globe,
  Loader2,
  Trash2,
  Edit,
  Settings,
  LayoutDashboard,
  Database,
  Menu,
  Key,
  Upload,
  ChevronDown,
  HardDrive,
  Network,
  UserPlus,
  Check,
  X,
  Copy,
  Download,
  FileText,
  Folder,
  Play,
  Pause,
  Search,
  Code2,
  History,
  Filter,
  MessageSquare,
  Timer,
  Plus,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { DeploymentForm } from "@/components/DeploymentForm";
import AddDNSRecordForm from "@/components/AddDNSRecordForm";
import EditDNSRecordForm from "@/components/EditDNSRecordForm";
import AddZoneForm from "@/components/AddZoneForm";
import { EditWorkerForm } from "@/components/EditWorkerForm";
import { CreateWorkerForm } from "@/components/CreateWorkerForm";
import { BindD1DatabaseForm } from "@/components/BindD1DatabaseForm";
import { CreateD1DatabaseForm } from "@/components/CreateD1DatabaseForm";
import { BindR2BucketForm } from "@/components/BindR2BucketForm";
import { BindKVNamespaceForm } from "@/components/BindKVNamespaceForm";
import { ManageWorkerVariablesForm } from "@/components/ManageWorkerVariablesForm";
import { CreateTunnelForm } from "@/components/CreateTunnelForm";
import { EditTunnelForm } from "@/components/EditTunnelForm";
import { TunnelConfigForm } from "@/components/TunnelConfigForm";
import { TunnelRouteForm } from "@/components/TunnelRouteForm";
import CreateRateLimitRuleForm from "@/components/CreateRateLimitRuleForm";
import OperationHistoryPanel from "@/components/OperationHistoryPanel";
import WorkerTemplateLibrary from "@/components/WorkerTemplateLibrary";
import FeedbackLibrary from "@/components/FeedbackLibrary";
import AutoOptimizationPanel from "@/components/AutoOptimizationPanel";
import { WorkerAnalyticsPanel } from "@/components/WorkerAnalyticsPanel";
import { AnalyticsView } from "@/components/index-page/analytics/AnalyticsView";
import { WorkersView } from "@/components/index-page/workers/WorkersView";
import type { WorkerListItem } from "@/components/index-page/workers/workers-types";
import { PageRulesView } from "@/components/index-page/page-rules/PageRulesView";
import {
  buildPageRuleActions,
  buildPageRuleTargets,
  createEmptyPageRuleForm,
  getPageRuleUrlPattern,
  mapRuleToForm,
} from "@/components/index-page/page-rules/page-rule-form";
import type { PageRuleFormState } from "@/components/index-page/page-rules/page-rule-types";
import { PagesView } from "@/components/index-page/pages/PagesView";
import { CreatePagesProjectDialog } from "@/components/index-page/pages/CreatePagesProjectDialog";
import type { PagesDeploymentSummary, PagesProjectSummary } from "@/components/index-page/pages/pages-types";
import { KvStorageView } from "@/components/index-page/kv-storage/KvStorageView";
import { CertificatesView } from "@/components/index-page/certificates/CertificatesView";
import { D1DatabaseView } from "@/components/index-page/d1-database/D1DatabaseView";
import { R2StorageView } from "@/components/index-page/r2-storage/R2StorageView";
import { TunnelsView } from "@/components/index-page/tunnels/TunnelsView";
import { ProviderSwitcher } from "@/components/ProviderSwitcher";
import {
  buildSidebarItems,
  type CapabilitySidebarKey,
  type SidebarItem,
} from "@/components/index-page/shared/capability-menu";
import type {
  D1DatabaseSummary,
  D1QueryResult,
  KVKeySummary,
  KVNamespaceSummary,
  R2BucketSummary,
  R2ObjectSummary,
  TunnelSummary,
} from "@/components/index-page/shared/index-page-types";
import {
  buildKvExportFileName,
  parseKvImportJson,
} from "@/components/index-page/kv-storage/kv-storage-actions";
import type { KvImportEntry } from "@/components/index-page/kv-storage/kv-storage-types";
import type { AnalyticsPeriod, AnalyticsPoint } from "@/lib/providers/capabilities/analytics";
import type { D1Database } from "@/lib/providers/capabilities/d1";
import type { PagesProject } from "@/lib/providers/capabilities/pages";
import type { R2Bucket } from "@/lib/providers/capabilities/r2";
import type { Tunnel } from "@/lib/providers/capabilities/tunnels";
import { ProviderError } from "@/lib/providers/errors";
import { providers } from "@/lib/providers/registry";
import type {
  Certificate,
  DnsRecord as ProviderDnsRecord,
  PageRule as ProviderPageRule,
  ProviderCredentials,
  ProviderId,
  WorkerScript,
  Zone as ProviderZone,
} from "@/lib/providers/types";
import { Separator } from "@/components/ui/separator";
import spiderIcon from "@/assets/spider-icon.png";
import { useSearchParams } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

interface CloudflareZone {
  id: string;
  name: string;
  status: string;
  name_servers?: string[];
  account?: {
    id: string;
    name: string;
  };
}

interface DNSRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied: boolean;
  ttl: number;
}

interface WorkerRoute {
  id: string;
  pattern: string;
  script: string;
}

interface Worker {
  id: string;
  script_name?: string;
  created_on: string;
  modified_on?: string;
  etag?: string;
  usage_model?: string;
  compatibility_date?: string;
  routes?: Array<{
    id?: string;
    pattern: string;
    script?: string;
  }>;
}

interface WorkerDetail extends Worker {
  handlers?: string[];
  last_deployed_from?: string;
  bindings?: Array<{
    type: string;
    name: string;
    id?: string;
    namespace_id?: string;
  }>;
}

interface WorkerBinding {
  type: string;
  name: string;
  id?: string;
  namespace_id?: string;
  database_id?: string;
  realName?: string;
}

interface ZoneSetting {
  id: string;
  value: string | number | { strict_transport_security?: { enabled?: boolean } };
}

interface FirewallRuleFilter {
  id?: string;
  expression?: string;
}

interface FirewallRule {
  id: string;
  action?: string;
  description?: string;
  expression?: string;
  paused?: boolean;
  filter?: FirewallRuleFilter;
}

interface RateLimitRule {
  id: string;
}

interface CloudflareApiError {
  code?: number;
  message?: string;
}

type IndexView =
  | "deploy"
  | "zones"
  | "dns"
  | "workers"
  | "worker-detail"
  | "ssl"
  | "cache"
  | "firewall"
  | "analytics"
  | "page-rules"
  | "kv-storage"
  | "certificates"
  | "d1-database"
  | "r2-storage"
  | "tunnels"
  | "feedback"
  | "operation-history"
  | "worker-templates"
  | "auto-optimization"
  | "pages";

const CAPABILITY_ICON_BY_KEY: Record<CapabilitySidebarKey, typeof Globe> = {
  zones: Globe,
  dns: Database,
  "page-rules": Settings,
  workers: LayoutDashboard,
  kv: Key,
  certificates: Shield,
  analytics: LayoutDashboard,
  pages: FileText,
  r2: HardDrive,
  d1: Database,
  tunnels: Network,
};

const isProviderId = (value: string | null): value is ProviderId =>
  value === "cloudflare" || value === "edgeone" || value === "esa";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function toLegacyZone(zone: ProviderZone): CloudflareZone {
  const raw = isRecord(zone.raw) ? (zone.raw as Partial<CloudflareZone>) : {};
  return {
    ...raw,
    id: zone.id,
    name: zone.name,
    status: zone.status,
  };
}

function toLegacyDnsRecord(record: ProviderDnsRecord): DNSRecord {
  return {
    id: record.id,
    type: record.type,
    name: record.name,
    content: record.content,
    proxied: record.proxied ?? false,
    ttl: record.ttl,
  };
}

function toLegacyD1Database(database: D1Database): D1DatabaseSummary {
  return {
    uuid: database.uuid,
    name: database.name,
    created_at: database.createdAt,
  };
}

function toLegacyR2Bucket(bucket: R2Bucket): R2BucketSummary {
  return {
    name: bucket.name,
    creation_date: bucket.creationDate,
  };
}

function toLegacyTunnel(tunnel: Tunnel): TunnelSummary {
  return {
    id: tunnel.id,
    name: tunnel.name,
    created_at: tunnel.createdAt,
    status: tunnel.status,
  };
}

function toLegacyPagesProject(project: PagesProject): PagesProjectSummary {
  const raw = isRecord(project.raw) ? (project.raw as Partial<PagesProjectSummary>) : {};
  return {
    ...raw,
    id: project.id,
    name: project.name,
    subdomain: project.subdomain,
    created_on: project.createdOn,
  };
}

function toLegacyWorker(worker: WorkerScript): Worker {
  return {
    id: worker.id,
    created_on: worker.modifiedOn,
    modified_on: worker.modifiedOn,
  };
}

function toWorkersViewItem(worker: Worker): WorkerListItem {
  return {
    id: worker.id,
    modifiedOn: worker.modified_on || worker.created_on,
    createdOn: worker.created_on,
    routes: worker.routes,
  };
}

interface ProviderApiEnvelope<T> {
  success?: boolean;
  result?: T;
  error?: string;
  errors?: CloudflareApiError[];
  data?: ProviderApiEnvelope<T>;
}

function unwrapProviderApiResult<T>(
  response: ProviderApiEnvelope<T> | null,
): T | undefined {
  const envelope = response?.data ?? response;
  return envelope?.success ? envelope.result : undefined;
}

function unwrapProviderApiEnvelope<T>(
  response: ProviderApiEnvelope<T> | null,
): ProviderApiEnvelope<T> | undefined {
  return response?.data ?? response ?? undefined;
}

function getAccountDisplayName(account: CloudflareAccount): string {
  switch (account.provider) {
    case "cloudflare":
      return account.credentials.provider === "cloudflare"
        ? account.credentials.email
        : account.label;
    case "edgeone":
      return account.credentials.provider === "edgeone"
        ? account.label || account.credentials.secretId
        : account.label;
    case "esa":
      return account.credentials.provider === "esa"
        ? account.label || account.credentials.accessKeyId
        : account.label;
  }
}

function getAccountDescription(account: CloudflareAccount): string | undefined {
  switch (account.provider) {
    case "cloudflare":
      return account.nickname;
    case "edgeone":
      return account.credentials.provider === "edgeone"
        ? `SecretId: ${account.credentials.secretId}`
        : undefined;
    case "esa":
      return account.credentials.provider === "esa"
        ? `AccessKeyId: ${account.credentials.accessKeyId}`
        : undefined;
  }
}

function getProviderEmptyZonesText(providerId: ProviderId): string {
  switch (providerId) {
    case "cloudflare":
      return "未找到域名，请在 Cloudflare 中添加域名";
    case "edgeone":
      return "未找到站点，请在腾讯云 EdgeOne 中添加站点";
    case "esa":
      return "阿里云 ESA 暂未接入域名管理";
  }
}

function providerHasImplementedCapabilities(providerId: ProviderId): boolean {
  return Object.keys(providers[providerId].capabilities).length > 0;
}

function getCredentialCopy(providerId: ProviderId): {
  primaryLabel: string;
  primaryPlaceholder: string;
  secretLabel: string;
  secretPlaceholder: string;
  helpText: string;
} {
  switch (providerId) {
    case "cloudflare":
      return {
        primaryLabel: "Cloudflare 账号邮箱",
        primaryPlaceholder: "your@email.com",
        secretLabel: "Cloudflare API 密钥",
        secretPlaceholder: "您的 API 密钥",
        helpText: "点击右上角头像→ 配置文件→ API 令牌→ 下拉到API 密钥→ 查看或创建Global API Key",
      };
    case "edgeone":
      return {
        primaryLabel: "腾讯云 SecretId",
        primaryPlaceholder: "AKID...",
        secretLabel: "腾讯云 SecretKey",
        secretPlaceholder: "您的 SecretKey",
        helpText: "使用拥有 EdgeOne 读取/管理权限的腾讯云 API 密钥。",
      };
    case "esa":
      return {
        primaryLabel: "阿里云 AccessKeyId",
        primaryPlaceholder: "LTAI...",
        secretLabel: "阿里云 AccessKeySecret",
        secretPlaceholder: "您的 AccessKeySecret",
        helpText: "阿里云 ESA 后端能力暂未接入，当前版本不会保存或验证该凭据。",
      };
  }
}

function buildCredentialsFromFields(
  providerId: ProviderId,
  primary: string,
  secret: string,
): ProviderCredentials | null {
  const first = primary.trim();
  const second = secret.trim();
  if (!first || !second) return null;

  switch (providerId) {
    case "cloudflare":
      return { provider: "cloudflare", email: first, apiKey: second };
    case "edgeone":
      return { provider: "edgeone", secretId: first, secretKey: second };
    case "esa":
      return { provider: "esa", accessKeyId: first, accessKeySecret: second };
  }
}

function getCredentialAccountLabel(credentials: ProviderCredentials): string {
  switch (credentials.provider) {
    case "cloudflare":
      return credentials.email;
    case "edgeone":
      return credentials.secretId;
    case "esa":
      return credentials.accessKeyId;
  }
}

const Index = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeProviderId, setActiveProviderId] = useState<ProviderId>(() => {
    const provider = searchParams.get("provider");
    return isProviderId(provider) ? provider : "cloudflare";
  });

  // Cloudflare 凭据
  const [cfEmail, setCfEmail] = useState("");
  const [cfApiKey, setCfApiKey] = useState("");
  const [hasCredentials, setHasCredentials] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // 多账号管理
  const [savedAccounts, setSavedAccounts] = useState<CloudflareAccount[]>([]);
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);

  // 数据状态
  const [zones, setZones] = useState<CloudflareZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>("");
  const [selectedZoneName, setSelectedZoneName] = useState<string>("");
  const [dnsRecords, setDnsRecords] = useState<DNSRecord[]>([]);
  const [workerRoutes, setWorkerRoutes] = useState<WorkerRoute[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workerSubdomain, setWorkerSubdomain] = useState<string>(() => {
    return getCookie("cf_worker_subdomain") || "";
  });
  const [selectedWorker, setSelectedWorker] = useState<string>("");
  const [workerDetail, setWorkerDetail] = useState<WorkerDetail | null>(null);
  const [workerBindings, setWorkerBindings] = useState<WorkerBinding[]>([]);
  const [allWorkerBindings, setAllWorkerBindings] = useState<Record<string, WorkerBinding[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [activeView, setActiveView] = useState<IndexView>("zones");
  const [dnsNavClicks, setDnsNavClicks] = useState(0);
  const [d1Databases, setD1Databases] = useState<D1DatabaseSummary[]>([]);
  const [r2Buckets, setR2Buckets] = useState<R2BucketSummary[]>([]);
  const [tunnels, setTunnels] = useState<TunnelSummary[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [kvNamespaces, setKvNamespaces] = useState<KVNamespaceSummary[]>([]);
  const [selectedKvNamespace, setSelectedKvNamespace] = useState<string>("");
  const [kvKeys, setKvKeys] = useState<KVKeySummary[]>([]);
  const [selectedKvKeys, setSelectedKvKeys] = useState<string[]>([]);
  const [logoClicks, setLogoClicks] = useState(0);
  // 从 D1 数据库读取 Workers 隐藏开关
  const [workersHiddenByDefault, setWorkersHiddenByDefault] = useState<boolean>(false);
  const [isLoadingWorkersSetting, setIsLoadingWorkersSetting] = useState(false);

  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = adminEmails.includes(cfEmail.trim().toLowerCase());
  const [showWorkers, setShowWorkers] = useState(() => {
    // 如果设置为不隐藏，则默认显示
    return !workersHiddenByDefault;
  });
  const [workerShortcutClicks, setWorkerShortcutClicks] = useState(0);
  const [workerPermanentlyVisible, setWorkerPermanentlyVisible] = useState(false);
  const [r2Error, setR2Error] = useState<string | null>(null);
  // Pages 管理
  const [pagesProjects, setPagesProjects] = useState<PagesProjectSummary[]>([]);
  const [selectedPagesProject, setSelectedPagesProject] = useState<string>("");
  const [pagesDeployments, setPagesDeployments] = useState<PagesDeploymentSummary[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [showPagesDeployments, setShowPagesDeployments] = useState(false);
  // 新建 Pages 项目对话框
  const [createPagesProjectOpen, setCreatePagesProjectOpen] = useState(false);
  // 删除 Worker 确认对话框
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  // 编辑 Worker 对话框
  const [editWorkerOpen, setEditWorkerOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<{ id: string; name: string } | null>(null);
  // 新建 Worker 对话框
  const [createWorkerOpen, setCreateWorkerOpen] = useState(false);
  // 绑定 D1 数据库对话框
  const [bindD1Open, setBindD1Open] = useState(false);
  const [workerForD1Binding, setWorkerForD1Binding] = useState<{ id: string; name: string } | null>(null);
  // 绑定 R2 存储桶对话框
  const [bindR2Open, setBindR2Open] = useState(false);
  const [workerForR2Binding, setWorkerForR2Binding] = useState<{ id: string; name: string } | null>(null);
  // 绑定 KV 命名空间对话框
  const [bindKVOpen, setBindKVOpen] = useState(false);
  const [workerForKVBinding, setWorkerForKVBinding] = useState<{ id: string; name: string } | null>(null);
  // 管理 Worker 变量对话框
  const [manageVariablesOpen, setManageVariablesOpen] = useState(false);
  const [workerForVariables, setWorkerForVariables] = useState<{ id: string; name: string } | null>(null);
  // 退出账号对话框
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  // Tunnel 管理对话框
  const [createTunnelOpen, setCreateTunnelOpen] = useState(false);
  const [editTunnelOpen, setEditTunnelOpen] = useState(false);
  const [tunnelConfigOpen, setTunnelConfigOpen] = useState(false);
  const [tunnelRouteOpen, setTunnelRouteOpen] = useState(false);
  const [selectedTunnel, setSelectedTunnel] = useState<TunnelSummary | null>(null);
  // D1 SQL 控制台
  const [selectedD1Database, setSelectedD1Database] = useState<string>("");
  const [d1SqlQuery, setD1SqlQuery] = useState<string>("");
  const [d1QueryResult, setD1QueryResult] = useState<D1QueryResult | null>(null);
  const [isExecutingD1Query, setIsExecutingD1Query] = useState(false);
  const [d1QueryHistory, setD1QueryHistory] = useState<string[]>([]);
  const [d1HistoryIndex, setD1HistoryIndex] = useState<number>(-1);
  // R2 文件管理
  const [selectedR2Bucket, setSelectedR2Bucket] = useState<string>("");
  const [r2Files, setR2Files] = useState<R2ObjectSummary[]>([]);
  const [isLoadingR2Files, setIsLoadingR2Files] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showR2S3Config, setShowR2S3Config] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DNSRecord | null>(null);
  const [analyticsPoints, setAnalyticsPoints] = useState<AnalyticsPoint[]>([]);
  // 创建 D1 数据库对话框
  const [showCreateD1DatabaseForm, setShowCreateD1DatabaseForm] = useState(false);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>("7d");
  const [sslMode, setSslMode] = useState<string>("");
  const [alwaysUseHttps, setAlwaysUseHttps] = useState<boolean>(false);
  const [automaticHttpsRewrites, setAutomaticHttpsRewrites] = useState<boolean>(false);
  const [hstsEnabled, setHstsEnabled] = useState<boolean>(false);
  const [opportunisticEncryption, setOpportunisticEncryption] = useState<boolean>(false);
  const [tls13, setTls13] = useState<boolean>(false);
  const [cacheLevel, setCacheLevel] = useState<string>("aggressive");
  const [browserCacheTtl, setBrowserCacheTtl] = useState<number>(14400);
  const [developmentMode, setDevelopmentMode] = useState<boolean>(false);
  const [alwaysOnline, setAlwaysOnline] = useState<boolean>(false);
  const [purgeUrl, setPurgeUrl] = useState<string>("");
  const [purgeType, setPurgeType] = useState<"url" | "host" | "tag" | "prefix">("url");
  const [firewallRules, setFirewallRules] = useState<FirewallRule[]>([]);
  const [firewallRulesetId, setFirewallRulesetId] = useState<string>("");
  const [rateLimitRules, setRateLimitRules] = useState<RateLimitRule[]>([]);
  const [rateLimitRulesetId, setRateLimitRulesetId] = useState<string>("");
  const [showCreateRateLimitForm, setShowCreateRateLimitForm] = useState(false);
  const [pageRules, setPageRules] = useState<ProviderPageRule[]>([]);

  // 页面规则表单状态
  const [editingPageRuleId, setEditingPageRuleId] = useState<string | null>(null);
  const [newPageRule, setNewPageRule] = useState<PageRuleFormState>(() => createEmptyPageRuleForm());

  // 性能优化设置
  const [brotliEnabled, setBrotliEnabled] = useState<boolean>(false);
  const [rocketLoaderMode, setRocketLoaderMode] = useState<string>("off");
  const [http3Enabled, setHttp3Enabled] = useState<boolean>(false);
  const [zeroRttEnabled, setZeroRttEnabled] = useState<boolean>(false);
  const [minifyHtml, setMinifyHtml] = useState<boolean>(false);
  const [minifyCss, setMinifyCss] = useState<boolean>(false);
  const [minifyJs, setMinifyJs] = useState<boolean>(false);
  const [newFirewallRule, setNewFirewallRule] = useState<{
    type: string;
    action: string;
    value: string;
    customExpression?: string;
    description?: string;
  }>({
    type: "ip",
    action: "block",
    value: "",
  });
  const [showExpressionExamples, setShowExpressionExamples] = useState(false);
  const [editingFirewallRule, setEditingFirewallRule] = useState<FirewallRule | null>(null);
  const hasInitializedAccountRef = useRef(false);

  const provider = providers[activeProviderId];
  const isCloudflareProvider = activeProviderId === "cloudflare";
  const isEdgeOneProvider = activeProviderId === "edgeone";
  const credentialCopy = getCredentialCopy(activeProviderId);
  const activeProviderAccounts = savedAccounts.filter(
    (account) => account.provider === activeProviderId,
  );
  const currentAccount =
    savedAccounts.find(
      (account) => account.id === currentAccountId && account.provider === activeProviderId,
    ) ?? null;
  const currentAccountDisplayName = currentAccount
    ? getAccountDisplayName(currentAccount)
    : cfEmail;

  const setCredentialFieldsFromAccount = (account: CloudflareAccount) => {
    switch (account.provider) {
      case "cloudflare":
        setCfEmail(account.credentials.provider === "cloudflare" ? account.credentials.email : "");
        setCfApiKey(account.credentials.provider === "cloudflare" ? account.credentials.apiKey : "");
        break;
      case "edgeone":
        setCfEmail(account.credentials.provider === "edgeone" ? account.credentials.secretId : "");
        setCfApiKey(account.credentials.provider === "edgeone" ? account.credentials.secretKey : "");
        break;
      case "esa":
        setCfEmail(account.credentials.provider === "esa" ? account.credentials.accessKeyId : "");
        setCfApiKey(account.credentials.provider === "esa" ? account.credentials.accessKeySecret : "");
        break;
    }
  };

  const clearProviderResourceState = () => {
    setZones([]);
    setSelectedZone("");
    setSelectedZoneName("");
    setDnsRecords([]);
    setWorkerRoutes([]);
    setWorkers([]);
    setSelectedWorker("");
    setWorkerDetail(null);
    setWorkerBindings([]);
    setAllWorkerBindings({});
    setD1Databases([]);
    setR2Buckets([]);
    setTunnels([]);
    setCertificates([]);
    setKvNamespaces([]);
    setSelectedKvNamespace("");
    setKvKeys([]);
    setSelectedKvKeys([]);
    setPagesProjects([]);
    setSelectedPagesProject("");
    setPagesDeployments([]);
    setAnalyticsPoints([]);
    setPageRules([]);
    setEditingPageRuleId(null);
    setNewPageRule(createEmptyPageRuleForm());
    setActiveView("zones");
  };

  const getActiveCredentials = useCallback(
    (
      override?: ProviderCredentials | { email: string; apiKey: string },
    ): ProviderCredentials | null => {
      if (override) {
        if ("provider" in override) {
          return override;
        }

        return {
          provider: "cloudflare",
          email: override.email,
          apiKey: override.apiKey,
        };
      }

      const account = getCurrentAccount();
      if (account?.provider === activeProviderId) {
        return account.credentials;
      }

      if (activeProviderId === "cloudflare") {
        const email = cfEmail || getCookie("cf_email");
        const apiKey = cfApiKey || getCookie("cf_api_key");

        if (email && apiKey) {
          return { provider: "cloudflare", email, apiKey };
        }
      }

      return null;
    },
    [activeProviderId, cfApiKey, cfEmail],
  );

  const handleProviderLoadError = useCallback(
    (error: unknown, title = "加载失败") => {
      if (error instanceof ProviderError && error.code === "AUTH_INVALID") {
        toast({
          title: "凭据无效",
          description: "请在账号管理中重新填写凭据",
          variant: "destructive",
        });
        return;
      }

      toast({
        title,
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    },
    [toast],
  );

  const handleProviderChange = (nextProviderId: ProviderId) => {
    if (nextProviderId === activeProviderId) return;

    clearProviderResourceState();
    setActiveProviderId(nextProviderId);
    setSearchParams((previousParams) => {
      const nextParams = new URLSearchParams(previousParams);
      nextParams.set("provider", nextProviderId);
      return nextParams;
    });

    const nextAccount = savedAccounts.find((account) => account.provider === nextProviderId) ?? null;
    if (!nextAccount || !providerHasImplementedCapabilities(nextProviderId)) {
      setCurrentAccountId(null);
      setCfEmail("");
      setCfApiKey("");
      setHasCredentials(false);
      return;
    }

    setCurrentAccount(nextAccount.id);
    setCurrentAccountId(nextAccount.id);
    setCredentialFieldsFromAccount(nextAccount);
    setHasCredentials(true);
    void loadZones(nextAccount.credentials);
  };

  // 从 D1 数据库加载 Workers 隐藏设置
  const loadWorkersHiddenSetting = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("cf-d1-query", {
        body: {
          action: "query",
          sql: "SELECT value FROM app_settings WHERE key = 'workers_hidden'",
        },
      });

      if (error) throw error;

      if (data.success && data.result && data.result.length > 0) {
        const hidden = data.result[0].value === "true";
        setWorkersHiddenByDefault(hidden);
        if (!hidden) {
          setShowWorkers(true);
        }
      }
    } catch (error) {
      console.error("Load workers setting error:", error);
    }
  }, []);

  // 更新 Workers 隐藏设置到 D1 数据库
  const updateWorkersHiddenSetting = async (hidden: boolean) => {
    setIsLoadingWorkersSetting(true);
    try {
      const { data, error } = await supabase.functions.invoke("cf-d1-query", {
        body: {
          action: "execute",
          sql: "UPDATE app_settings SET value = ?, updated_at = datetime('now') WHERE key = 'workers_hidden'",
          params: [String(hidden)],
        },
      });

      if (error) throw error;

      if (data.success) {
        setWorkersHiddenByDefault(hidden);

        // 如果切换为不隐藏，立即显示 Workers
        if (!hidden) {
          setShowWorkers(true);
          setWorkerPermanentlyVisible(false);
        } else {
          // 如果切换为隐藏，需要根据当前状态决定是否隐藏
          if (!workerPermanentlyVisible) {
            setShowWorkers(false);
          }
        }

        toast({
          title: hidden ? "Workers 已设为隐藏模式" : "Workers 已设为公开模式",
          description: hidden ? "需要点击 logo 11次或按 Ctrl+Z 11次来解锁" : "Workers 功能现在对所有人可见",
        });
      }
    } catch (error) {
      console.error("Update workers setting error:", error);
      toast({
        title: "更新失败",
        description: error instanceof Error ? error.message : "无法更新设置",
        variant: "destructive",
      });
    } finally {
      setIsLoadingWorkersSetting(false);
    }
  };

  // 监听快捷键来切换 Worker 模块显示
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Shift + X: 切换 Worker 模块显示（仅在隐藏模式下需要解锁）
      if (event.shiftKey && event.key === "X") {
        event.preventDefault();

        // 如果设置为公开模式，直接切换显示
        if (!workersHiddenByDefault) {
          setShowWorkers(!showWorkers);
          toast({
            description: showWorkers ? "Workers 已隐藏" : "Workers 已显示",
          });
          return;
        }

        // 隐藏模式：如果已经永久显示，不做任何操作
        if (workerPermanentlyVisible) {
          toast({
            description: "Workers 已解锁",
          });
          return;
        }

        const newCount = workerShortcutClicks + 1;
        setWorkerShortcutClicks(newCount);

        // 如果按了11次，worker 模块永久显示
        if (newCount >= 11) {
          setWorkerPermanentlyVisible(true);
          setShowWorkers(true);
          toast({
            title: "Workers 功能已永久解锁",
            description: "Workers 模块现在将保持显示状态",
          });
        } else {
          // 否则切换显示/隐藏
          setShowWorkers(!showWorkers);
          toast({
            description: showWorkers ? "Workers 已隐藏" : `Workers 已显示 (${newCount}/11)`,
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showWorkers, toast, workerShortcutClicks, workerPermanentlyVisible, workersHiddenByDefault]);

  const loadPageRules = useCallback(async () => {
    const credentials = getActiveCredentials();
    const pageRulesCapability = provider.capabilities.pageRules;
    if (!credentials || !pageRulesCapability || !selectedZone) return;

    setIsLoading(true);
    try {
      const rules = await pageRulesCapability.list(credentials, selectedZone);
      setPageRules(rules);
    } catch (error) {
      console.error("Load page rules error:", error);
      handleProviderLoadError(error, "加载页面规则失败");
    } finally {
      setIsLoading(false);
    }
  }, [getActiveCredentials, handleProviderLoadError, provider.capabilities.pageRules, selectedZone]);

  const createOrUpdatePageRule = async () => {
    const credentials = getActiveCredentials();
    const pageRulesCapability = provider.capabilities.pageRules;
    if (!credentials || !pageRulesCapability || !selectedZone) return;

    if (!newPageRule.urlPattern.trim()) {
      toast({
        title: "请填写 URL 模式",
        variant: "destructive",
      });
      return;
    }

    const actions = buildPageRuleActions(newPageRule);
    if (actions.length === 0) {
      toast({
        title: "请至少选择一个规则设置",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (!editingPageRuleId && credentials.provider === "cloudflare") {
        try {
          const urlPattern = newPageRule.urlPattern.trim();
          let hostname = "";
          const cleanUrl = urlPattern.replace(/^https?:\/\//, "");
          const pathIndex = cleanUrl.indexOf("/");
          hostname = pathIndex > 0 ? cleanUrl.substring(0, pathIndex) : cleanUrl;
          hostname = hostname.replace(/\*/g, "").replace(/^\.+/, "");

          if (hostname && hostname.includes(".")) {
            const dnsResult = await supabase.functions.invoke("cloudflare-api", {
              body: {
                action: "create_dns_record",
                email: credentials.email,
                apiKey: credentials.apiKey,
                zoneId: selectedZone,
                recordData: {
                  type: "A",
                  name: hostname,
                  content: "223.5.5.5",
                  proxied: true,
                  ttl: 1,
                },
              },
            });

            if (dnsResult.data?.success || dnsResult.data?.errors?.[0]?.code === 81057) {
              console.log("DNS记录已就绪:", hostname);
            }
          }
        } catch (dnsError) {
          console.log("自动创建DNS记录失败，继续创建页面规则:", dnsError);
        }
      }

      const existingRule = editingPageRuleId
        ? pageRules.find((rule) => rule.id === editingPageRuleId)
        : undefined;
      const ruleData = {
        id: editingPageRuleId ?? "",
        zoneId: selectedZone,
        status: newPageRule.status,
        priority: existingRule?.priority,
        rawTargets: buildPageRuleTargets(newPageRule),
        rawActions: actions,
      };

      if (editingPageRuleId) {
        await pageRulesCapability.update(credentials, selectedZone, ruleData);
      } else {
        await pageRulesCapability.create(credentials, selectedZone, {
          status: ruleData.status,
          priority: ruleData.priority,
          rawTargets: ruleData.rawTargets,
          rawActions: ruleData.rawActions,
        });
      }

      toast({
        title: editingPageRuleId ? "页面规则更新成功" : "页面规则创建成功",
        description:
          !editingPageRuleId && credentials.provider === "cloudflare"
            ? "已自动创建对应的DNS记录（如不存在）"
            : undefined,
      });
      setNewPageRule(createEmptyPageRuleForm());
      setEditingPageRuleId(null);
      await loadPageRules();
    } catch (error) {
      console.error("Create/Update page rule error:", error);
      toast({
        title: editingPageRuleId ? "更新失败" : "创建失败",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePageRule = async (ruleId: string, checked: boolean) => {
    const credentials = getActiveCredentials();
    const pageRulesCapability = provider.capabilities.pageRules;
    const rule = pageRules.find((item) => item.id === ruleId);
    if (!credentials || !pageRulesCapability || !selectedZone || !rule) return;

    setIsLoading(true);
    try {
      await pageRulesCapability.update(credentials, selectedZone, {
        ...rule,
        status: checked ? "active" : "disabled",
      });
      toast({ title: checked ? "规则已启用" : "规则已禁用" });
      await loadPageRules();
    } catch (error) {
      console.error("Toggle page rule error:", error);
      toast({
        title: "更新失败",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditPageRule = (ruleId: string) => {
    const rule = pageRules.find((item) => item.id === ruleId);
    if (!rule) return;

    setNewPageRule(mapRuleToForm(rule));
    setEditingPageRuleId(rule.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast({
      title: "编辑模式",
      description: "表单已填充数据",
    });
  };

  const handleDeletePageRule = async (ruleId: string) => {
    const credentials = getActiveCredentials();
    const pageRulesCapability = provider.capabilities.pageRules;
    const rule = pageRules.find((item) => item.id === ruleId);
    if (!credentials || !pageRulesCapability || !selectedZone || !rule) return;

    if (!confirm(`确定删除这条规则吗？\n${getPageRuleUrlPattern(rule) || rule.id}`)) return;

    setIsLoading(true);
    try {
      await pageRulesCapability.delete(credentials, selectedZone, rule.id);
      toast({ title: "删除成功" });
      await loadPageRules();
    } catch (error) {
      console.error("Delete page rule error:", error);
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "请求失败",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetAllState = () => {
    // 重置所有数据状态
    setZones([]);
    setSelectedZone("");
    setSelectedZoneName("");
    setDnsRecords([]);
    setWorkerRoutes([]);
    setWorkers([]);
    setSelectedWorker("");
    setWorkerDetail(null);
    setActiveView("zones");
    setDnsNavClicks(0);
    setEditingRecord(null);
    setAnalyticsPoints([]);
    setSslMode("");
    setAlwaysUseHttps(false);
    setAutomaticHttpsRewrites(false);
    setHstsEnabled(false);
    setOpportunisticEncryption(false);
    setTls13(false);
    setCacheLevel("aggressive");
    setBrowserCacheTtl(14400);
    setDevelopmentMode(false);
    setAlwaysOnline(false);
    setPurgeUrl("");
    setPurgeType("url");
    setFirewallRules([]);
    setFirewallRulesetId("");
    setPageRules([]);
    setEditingPageRuleId(null);
    setNewPageRule(createEmptyPageRuleForm());
    setBrotliEnabled(false);
    setRocketLoaderMode("off");
    setHttp3Enabled(false);
    setZeroRttEnabled(false);
    setMinifyHtml(false);
    setMinifyCss(false);
    setMinifyJs(false);
    setNewFirewallRule({
      type: "ip",
      action: "block",
      value: "",
    });
    setD1Databases([]);
    setR2Buckets([]);
    setTunnels([]);
    setCertificates([]);
    setLogoClicks(0);
    setShowWorkers(false);
    setR2Error(null);
  };

  const loadD1Databases = useCallback(async () => {
    const credentials = getActiveCredentials();
    const d1Capability = provider.capabilities.d1;
    if (!credentials || !d1Capability) return;

    setIsLoading(true);
    try {
      const databases = await d1Capability.listDatabases(credentials);
      setD1Databases(databases.map(toLegacyD1Database));
    } catch (error) {
      console.error("Load D1 databases error:", error);
      handleProviderLoadError(error, "加载 D1 数据库失败");
    } finally {
      setIsLoading(false);
    }
  }, [getActiveCredentials, handleProviderLoadError, provider.capabilities.d1]);

  const resolveCloudflareAccountId = useCallback(async (): Promise<string | null> => {
    const existingAccountId = zones[0]?.account?.id;
    if (existingAccountId) return existingAccountId;

    const credentials = getActiveCredentials();
    if (!credentials || credentials.provider !== "cloudflare") return null;

    const { data, error } = await invokeProviderApi<ProviderApiEnvelope<CloudflareZone[]>>(
      "auto",
      { action: "list_zones" },
      credentials,
    );
    if (error) throw error;

    return unwrapProviderApiResult(data)?.[0]?.account?.id ?? null;
  }, [getActiveCredentials, zones]);

  const handleRunD1Query = async () => {
    if (!selectedD1Database) {
      toast({
        title: "请选择数据库",
        variant: "destructive",
      });
      return;
    }

    const sql = d1SqlQuery.trim();
    if (!sql) {
      toast({
        title: "请输入 SQL 查询",
        variant: "destructive",
      });
      return;
    }

    const credentials = getActiveCredentials();
    const d1Capability = provider.capabilities.d1;
    if (!credentials || !d1Capability) {
      toast({
        title: "未找到凭据",
        description: "请先登录支持 D1 的账号",
        variant: "destructive",
      });
      return;
    }

    setIsExecutingD1Query(true);
    setD1QueryResult(null);
    try {
      const result = await d1Capability.query(credentials, selectedD1Database, sql);
      setD1QueryResult((Array.isArray(result) ? result[0] : result) as D1QueryResult);

      setD1QueryHistory((previous) => {
        const filtered = previous.filter((query) => query !== sql);
        return [sql, ...filtered].slice(0, 50);
      });
      setD1SqlQuery("");
      setD1HistoryIndex(-1);
    } catch (error) {
      console.error("Execute D1 query error:", error);
      toast({
        title: "查询失败",
        description: error instanceof Error ? error.message : "无法执行查询",
        variant: "destructive",
      });
    } finally {
      setIsExecutingD1Query(false);
    }
  };

  const handleDeleteD1Database = async (databaseId: string) => {
    const database = d1Databases.find((item) => item.uuid === databaseId);
    if (!database) return;
    if (!confirm(`确定要删除数据库 ${database.name} 吗？此操作不可撤销！`)) return;

    const credentials = getActiveCredentials();
    if (!credentials) {
      toast({
        title: "缺少凭据",
        description: "请先登录账号",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const accountId = await resolveCloudflareAccountId();
      if (!accountId) {
        toast({
          title: "无法确定账号",
          description: "未找到可用的 Cloudflare 账号",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await invokeProviderApi<ProviderApiEnvelope<unknown>>(
        "auto",
        {
          action: "delete_d1_database",
          accountId,
          databaseId,
        },
        credentials,
      );
      if (error) throw error;

      const envelope = unwrapProviderApiEnvelope(data);
      if (envelope?.success) {
        toast({
          title: "数据库已删除",
          description: `${database.name} 已成功删除`,
        });
        await loadD1Databases();
      } else {
        throw new Error(envelope?.errors?.[0]?.message || "删除失败");
      }
    } catch (error) {
      console.error("Delete D1 database error:", error);
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "无法删除数据库",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadKvNamespaces = useCallback(async () => {
    const credentials = getActiveCredentials();
    const kvCapability = provider.capabilities.kv;
    if (!credentials || !kvCapability) return;
    if (isEdgeOneProvider && !selectedZone) {
      setKvNamespaces([]);
      setSelectedKvNamespace("");
      setKvKeys([]);
      return;
    }

    setIsLoading(true);
    try {
      const namespaces = await kvCapability.listNamespaces(
        credentials,
        isEdgeOneProvider ? { zoneId: selectedZone } : undefined,
      );
      setKvNamespaces(namespaces);
      return namespaces;
    } catch (error) {
      console.error("Load KV namespaces error:", error);
      handleProviderLoadError(error, "加载 KV 命名空间失败");
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [
    getActiveCredentials,
    handleProviderLoadError,
    isEdgeOneProvider,
    provider.capabilities.kv,
    selectedZone,
  ]);

  const getEdgeOneKvContext = () => {
    const credentials = getActiveCredentials();
    const kvCapability = provider.capabilities.kv;
    if (!credentials || !kvCapability) return null;
    if (!selectedZone) {
      toast({
        title: "请先选择域名",
        description: "EdgeOne KV 命名空间属于具体站点",
        variant: "destructive",
      });
      return null;
    }

    return {
      credentials,
      kvCapability,
      options: { zoneId: selectedZone },
    };
  };

  const handleCreateKvNamespace = async (namespaceName: string) => {
    if (!namespaceName) {
      toast({
        title: "请输入命名空间名称",
        variant: "destructive",
      });
      return;
    }

    if (isEdgeOneProvider) {
      const credentials = getActiveCredentials();
      const kvCapability = provider.capabilities.kv;
      if (!credentials || !kvCapability?.createNamespace) return;
      if (!selectedZone) {
        toast({
          title: "请先选择域名",
          description: "EdgeOne KV 命名空间属于具体站点",
          variant: "destructive",
        });
        return;
      }

      setIsLoading(true);
      try {
        await kvCapability.createNamespace(credentials, namespaceName, { zoneId: selectedZone });
        toast({ title: "命名空间创建成功" });
        const input = document.getElementById("kv-namespace-name") as HTMLInputElement | null;
        if (input) input.value = "";
        await loadKvNamespaces();
      } catch (error) {
        console.error("Create EdgeOne namespace error:", error);
        toast({
          title: "创建失败",
          description: errorMessage(error),
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const email = getCookie("cf_email") || cfEmail;
    const apiKey = getCookie("cf_api_key") || cfApiKey;
    if (!email || !apiKey) {
      toast({
        title: "未找到 Cloudflare 凭证",
        description: "请先登录 Cloudflare 账号",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const accountId = zones[0]?.account?.id;
      if (!accountId) {
        toast({
          title: "无法获取账户 ID",
          description: "请先选择一个域名",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("cloudflare-api", {
        body: {
          action: "create_kv_namespace",
          email,
          apiKey,
          accountId,
          data: {
            title: namespaceName,
          },
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "命名空间创建成功",
        });
        const input = document.getElementById("kv-namespace-name") as HTMLInputElement | null;
        if (input) input.value = "";
        // 重新加载命名空间列表
        loadKvNamespaces();
      } else {
        toast({
          title: "创建失败",
          description: data.errors?.[0]?.message || "未知错误",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Create namespace error:", error);
      toast({
        title: "创建失败",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshKvNamespaces = async () => {
    const namespaces = await loadKvNamespaces();
    if (namespaces) {
      toast({
        title: `列表已刷新 (${namespaces.length} 个命名空间)`,
      });
    }
  };

  const handleDeleteKvNamespace = async (namespace: KVNamespaceSummary) => {
    if (
      !confirm(
        `确定要删除命名空间 "${namespace.title}" 吗？此操作将删除该命名空间下的所有键值对，且无法恢复。`,
      )
    ) {
      return;
    }

    if (isEdgeOneProvider) {
      const credentials = getActiveCredentials();
      const kvCapability = provider.capabilities.kv;
      if (!credentials || !kvCapability?.deleteNamespace) return;
      if (!selectedZone) {
        toast({
          title: "请先选择域名",
          description: "EdgeOne KV 命名空间属于具体站点",
          variant: "destructive",
        });
        return;
      }

      setIsLoading(true);
      try {
        await kvCapability.deleteNamespace(credentials, namespace.id, { zoneId: selectedZone });
        toast({ title: "命名空间删除成功" });
        setKvNamespaces(kvNamespaces.filter((n) => n.id !== namespace.id));
        if (selectedKvNamespace === namespace.id) {
          setSelectedKvNamespace("");
          setKvKeys([]);
        }
      } catch (e) {
        toast({
          title: "删除失败",
          description: errorMessage(e),
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const email = getCookie("cf_email") || cfEmail;
    const apiKey = getCookie("cf_api_key") || cfApiKey;
    if (!email || !apiKey) {
      toast({
        title: "未找到 Cloudflare 凭证",
        description: "请先登录 Cloudflare 账号",
        variant: "destructive",
      });
      return;
    }

    const accountId = zones[0]?.account?.id;
    if (!accountId) {
      toast({
        title: "无法获取账户 ID",
        description: "请先选择一个域名",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cloudflare-api", {
        body: {
          action: "delete_kv_namespace",
          email,
          apiKey,
          accountId,
          namespaceId: namespace.id,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({ title: "命名空间删除成功" });
        setKvNamespaces(kvNamespaces.filter((n) => n.id !== namespace.id));
        if (selectedKvNamespace === namespace.id) {
          setSelectedKvNamespace("");
          setKvKeys([]);
        }
      } else {
        toast({
          title: "删除失败",
          description: data.errors?.[0]?.message || "未知错误",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "删除失败",
        description: errorMessage(e),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveKvKeyValue = async () => {
    if (!selectedKvNamespace) {
      toast({ title: "请选择命名空间", variant: "destructive" });
      return;
    }
    const keyInput = document.getElementById("kv-key") as HTMLInputElement | null;
    const valInput = document.getElementById("kv-value") as HTMLTextAreaElement | null;
    const key = keyInput?.value?.trim() || "";
    const value = valInput?.value || "";
    if (!key) {
      toast({ title: "请输入键名", variant: "destructive" });
      return;
    }
    if (isEdgeOneProvider) {
      const context = getEdgeOneKvContext();
      if (!context) return;

      setIsLoading(true);
      try {
        await context.kvCapability.putValue(
          context.credentials,
          selectedKvNamespace,
          key,
          value,
          context.options,
        );
        toast({ title: "保存成功" });
        if (!kvKeys.find((item) => item.name === key)) {
          setKvKeys([...kvKeys, { name: key }]);
        }
      } catch (e) {
        toast({ title: "保存失败", description: errorMessage(e), variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
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
      const resp = await fetch(`${base}/values/${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: {
          "X-Auth-Email": email,
          "X-Auth-Key": apiKey,
          "Content-Type": "text/plain",
        },
        body: value,
      });
      const json = await resp.json().catch(() => ({}));
      if (resp.ok && json.success !== false) {
        toast({ title: "保存成功" });
        if (!kvKeys.find((k) => k.name === key)) {
          setKvKeys([...kvKeys, { name: key }]);
        }
      } else {
        toast({
          title: "保存失败",
          description: json.errors?.[0]?.message || `HTTP ${resp.status}`,
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({ title: "保存失败", description: errorMessage(e), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReadKvValue = async () => {
    if (!selectedKvNamespace) {
      toast({ title: "请选择命名空间", variant: "destructive" });
      return;
    }
    const keyInput = document.getElementById("kv-key") as HTMLInputElement | null;
    const valInput = document.getElementById("kv-value") as HTMLTextAreaElement | null;
    const key = keyInput?.value?.trim() || "";
    if (!key) {
      toast({ title: "请输入键名", variant: "destructive" });
      return;
    }
    if (isEdgeOneProvider) {
      const context = getEdgeOneKvContext();
      if (!context) return;

      setIsLoading(true);
      try {
        const value = await context.kvCapability.getValue(
          context.credentials,
          selectedKvNamespace,
          key,
          context.options,
        );
        if (valInput) valInput.value = value;
        toast({ title: "读取成功" });
      } catch (e) {
        toast({ title: "读取失败", description: errorMessage(e), variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
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
      const resp = await fetch(`${base}/values/${encodeURIComponent(key)}`, {
        method: "GET",
        headers: { "X-Auth-Email": email, "X-Auth-Key": apiKey },
      });
      if (resp.ok) {
        const text = await resp.text();
        if (valInput) valInput.value = text;
        toast({ title: "读取成功" });
      } else {
        const err = await resp.json().catch(() => ({}));
        toast({
          title: "读取失败",
          description: err.errors?.[0]?.message || `HTTP ${resp.status}`,
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({ title: "读取失败", description: errorMessage(e), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteKvKey = async () => {
    if (!selectedKvNamespace) {
      toast({ title: "请选择命名空间", variant: "destructive" });
      return;
    }
    const keyInput = document.getElementById("kv-key") as HTMLInputElement | null;
    const key = keyInput?.value?.trim() || "";
    if (!key) {
      toast({ title: "请输入键名", variant: "destructive" });
      return;
    }
    if (isEdgeOneProvider) {
      const context = getEdgeOneKvContext();
      if (!context) return;

      setIsLoading(true);
      try {
        await context.kvCapability.deleteKey(
          context.credentials,
          selectedKvNamespace,
          key,
          context.options,
        );
        toast({ title: "删除成功" });
        setKvKeys(kvKeys.filter((item) => item.name !== key));
        setSelectedKvKeys(selectedKvKeys.filter((name) => name !== key));
      } catch (e) {
        toast({ title: "删除失败", description: errorMessage(e), variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
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
      const resp = await fetch(`${base}/values/${encodeURIComponent(key)}`, {
        method: "DELETE",
        headers: { "X-Auth-Email": email, "X-Auth-Key": apiKey },
      });
      const json = await resp.json().catch(() => ({}));
      if (resp.ok && json.success !== false) {
        toast({ title: "删除成功" });
        setKvKeys(kvKeys.filter((k) => k.name !== key));
        setSelectedKvKeys(selectedKvKeys.filter((n) => n !== key));
      } else {
        toast({
          title: "删除失败",
          description: json.errors?.[0]?.message || `HTTP ${resp.status}`,
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({ title: "删除失败", description: errorMessage(e), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportKvKeys = async () => {
    if (!selectedKvNamespace) {
      toast({ title: "请选择命名空间", variant: "destructive" });
      return;
    }
    if (selectedKvKeys.length === 0 && kvKeys.length === 0) {
      toast({ title: "无可导出的键" });
      return;
    }
    const keysToExport = selectedKvKeys.length
      ? selectedKvKeys
      : kvKeys.map((k) => k.name);
    if (isEdgeOneProvider) {
      const context = getEdgeOneKvContext();
      if (!context) return;

      setIsLoading(true);
      try {
        const entries: KvImportEntry[] = [];
        for (const key of keysToExport) {
          const value = await context.kvCapability.getValue(
            context.credentials,
            selectedKvNamespace,
            key,
            context.options,
          );
          entries.push({ key, value });
        }
        const blob = new Blob([JSON.stringify(entries, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = buildKvExportFileName(selectedKvNamespace);
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast({ title: "导出完成", description: `共导出 ${entries.length} 个键` });
      } catch (e) {
        toast({ title: "导出失败", description: errorMessage(e), variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
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
      const entries: KvImportEntry[] = [];
      for (const k of keysToExport) {
        const resp = await fetch(`${base}/values/${encodeURIComponent(k)}`, {
          headers: { "X-Auth-Email": email, "X-Auth-Key": apiKey },
        });
        const val = resp.ok ? await resp.text() : "";
        entries.push({ key: k, value: val });
      }
      const blob = new Blob([JSON.stringify(entries, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = buildKvExportFileName(selectedKvNamespace);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "导出完成", description: `共导出 ${entries.length} 个键` });
    } catch (e) {
      toast({ title: "导出失败", description: errorMessage(e), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportKvKeys = async (file: File) => {
    if (!selectedKvNamespace) {
      toast({ title: "请选择命名空间", variant: "destructive" });
      return;
    }
    const text = await file.text();
    let entries: KvImportEntry[];
    try {
      entries = parseKvImportJson(text);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("数组")) {
        toast({ title: "格式错误，应为数组", variant: "destructive" });
      } else {
        toast({ title: "JSON 解析失败", variant: "destructive" });
      }
      return;
    }
    if (isEdgeOneProvider) {
      const context = getEdgeOneKvContext();
      if (!context) return;

      setIsLoading(true);
      try {
        let ok = 0;
        for (const item of entries) {
          await context.kvCapability.putValue(
            context.credentials,
            selectedKvNamespace,
            item.key,
            item.value,
            context.options,
          );
          ok++;
        }
        toast({ title: "导入完成", description: `成功 ${ok} 个` });
        const keys = await context.kvCapability.listKeys(
          context.credentials,
          selectedKvNamespace,
          context.options,
        );
        setKvKeys(keys);
      } catch (e) {
        toast({ title: "导入失败", description: errorMessage(e), variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
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
      let ok = 0;
      for (const item of entries) {
        const resp = await fetch(`${base}/values/${encodeURIComponent(item.key)}`, {
          method: "PUT",
          headers: {
            "X-Auth-Email": email,
            "X-Auth-Key": apiKey,
            "Content-Type": "text/plain",
          },
          body: item.value,
        });
        if (resp.ok) ok++;
      }
      toast({ title: "导入完成", description: `成功 ${ok} 个` });
      // 刷新列表
      const resp = await fetch(`${base}/keys?limit=1000`, {
        headers: { "X-Auth-Email": email, "X-Auth-Key": apiKey },
      });
      const j = await resp.json();
      if (j?.result) setKvKeys(j.result);
    } catch (e) {
      toast({ title: "导入失败", description: errorMessage(e), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadKvKeys = async () => {
    if (!selectedKvNamespace) {
      toast({ title: "请选择命名空间", variant: "destructive" });
      return;
    }
    if (isEdgeOneProvider) {
      const context = getEdgeOneKvContext();
      if (!context) return;

      setIsLoading(true);
      try {
        const keys = await context.kvCapability.listKeys(
          context.credentials,
          selectedKvNamespace,
          context.options,
        );
        setKvKeys(keys);
        setSelectedKvKeys([]);
        toast({ title: "已加载键列表", description: `共 ${keys.length} 个` });
      } catch (e) {
        toast({ title: "加载失败", description: errorMessage(e), variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
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
      const resp = await fetch(`${base}/keys?limit=1000`, {
        headers: { "X-Auth-Email": email, "X-Auth-Key": apiKey },
      });
      const json = await resp.json();
      if (resp.ok && json?.result) {
        setKvKeys(json.result);
        setSelectedKvKeys([]);
        toast({ title: "已加载键列表", description: `共 ${json.result.length} 个` });
      } else {
        toast({
          title: "加载失败",
          description: json.errors?.[0]?.message || `HTTP ${resp.status}`,
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({ title: "加载失败", description: errorMessage(e), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSelectedKvKeys = async () => {
    if (!selectedKvNamespace || selectedKvKeys.length === 0) return;
    if (isEdgeOneProvider) {
      const context = getEdgeOneKvContext();
      if (!context) return;

      setIsLoading(true);
      try {
        let ok = 0;
        for (const key of selectedKvKeys) {
          await context.kvCapability.deleteKey(
            context.credentials,
            selectedKvNamespace,
            key,
            context.options,
          );
          ok++;
        }
        setKvKeys(kvKeys.filter((item) => !selectedKvKeys.includes(item.name)));
        setSelectedKvKeys([]);
        toast({ title: "批量删除完成", description: `成功 ${ok} 个` });
      } catch (e) {
        toast({ title: "批量删除失败", description: errorMessage(e), variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const email = getCookie("cf_email") || cfEmail;
    const apiKey = getCookie("cf_api_key") || cfApiKey;
    const accountId = zones[0]?.account?.id;
    setIsLoading(true);
    try {
      const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${selectedKvNamespace}`;
      let ok = 0;
      for (const k of selectedKvKeys) {
        const resp = await fetch(`${base}/values/${encodeURIComponent(k)}`, {
          method: "DELETE",
          headers: { "X-Auth-Email": email!, "X-Auth-Key": apiKey! },
        });
        if (resp.ok) ok++;
      }
      setKvKeys(kvKeys.filter((i) => !selectedKvKeys.includes(i.name)));
      setSelectedKvKeys([]);
      toast({ title: "批量删除完成", description: `成功 ${ok} 个` });
    } catch (e) {
      toast({ title: "批量删除失败", description: errorMessage(e), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const loadR2Buckets = useCallback(async () => {
    const credentials = getActiveCredentials();
    const r2Capability = provider.capabilities.r2;
    if (!credentials || !r2Capability) return;

    setIsLoading(true);
    setR2Error(null);
    setR2Buckets([]); // 确保重置为空数组
    try {
      const buckets = await r2Capability.listBuckets(credentials);
      setR2Buckets(buckets.map(toLegacyR2Bucket));
    } catch (error) {
      console.error("Load R2 buckets error:", error);
      setR2Error(error instanceof Error ? error.message : "加载失败，请稍后重试");
      setR2Buckets([]); // 确保是数组
    } finally {
      setIsLoading(false);
    }
  }, [getActiveCredentials, provider.capabilities.r2]);

  const handleShowR2S3Config = (bucketName?: string) => {
    if (bucketName) {
      setSelectedR2Bucket(bucketName);
    }
    setShowR2S3Config(true);
  };

  const handleCopyText = (text: string) => {
    if (!text) return;
    void navigator.clipboard.writeText(text);
    toast({ title: "已复制到剪贴板" });
  };

  const handleRefreshR2Files = () => {
    setR2Files([]);
    toast({
      title: "请使用 S3 工具管理文件",
      description: "当前面板仅提供 R2 bucket 与 S3 API 配置",
    });
  };

  const handleUploadR2File = (file: File) => {
    setUploadingFile(false);
    toast({
      title: "请使用 S3 工具上传文件",
      description: `${file.name} 未上传；请使用 AWS CLI、Rclone 或 S3 SDK`,
    });
  };

  const handleDeleteR2Bucket = async (bucketName: string) => {
    if (!confirm(`确定要删除存储桶 ${bucketName} 吗？此操作不可撤销！`)) return;

    const credentials = getActiveCredentials();
    if (!credentials) {
      toast({
        title: "缺少凭据",
        description: "请先登录账号",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const accountId = await resolveCloudflareAccountId();
      if (!accountId) {
        toast({
          title: "无法确定账号",
          description: "未找到可用的 Cloudflare 账号",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await invokeProviderApi<ProviderApiEnvelope<unknown>>(
        "auto",
        {
          action: "delete_r2_bucket",
          accountId,
          bucketName,
        },
        credentials,
      );
      if (error) throw error;

      const envelope = unwrapProviderApiEnvelope(data);
      if (envelope?.success) {
        toast({
          title: "存储桶已删除",
          description: `${bucketName} 已成功删除`,
        });
        await loadR2Buckets();
      } else {
        throw new Error(envelope?.errors?.[0]?.message || "删除失败");
      }
    } catch (error) {
      console.error("Delete R2 bucket error:", error);
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "无法删除存储桶",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadTunnels = useCallback(async () => {
    const credentials = getActiveCredentials();
    const tunnelsCapability = provider.capabilities.tunnels;
    if (!credentials || !tunnelsCapability) return;

    setIsLoading(true);
    try {
      const activeTunnels = await tunnelsCapability.list(credentials);
      setTunnels(activeTunnels.map(toLegacyTunnel).filter((tunnel) => !tunnel.deleted_at));
    } catch (error) {
      console.error("Load tunnels error:", error);
      handleProviderLoadError(error, "加载 Tunnels 失败");
    } finally {
      setIsLoading(false);
    }
  }, [getActiveCredentials, handleProviderLoadError, provider.capabilities.tunnels]);

  const getTunnelById = (tunnelId: string): TunnelSummary | undefined =>
    tunnels.find((tunnel) => tunnel.id === tunnelId);

  const handleEditTunnel = (tunnelId: string) => {
    const tunnel = getTunnelById(tunnelId);
    if (!tunnel) return;
    setSelectedTunnel(tunnel);
    setEditTunnelOpen(true);
  };

  const handleTunnelConfig = (tunnelId: string) => {
    const tunnel = getTunnelById(tunnelId);
    if (!tunnel) return;
    setSelectedTunnel(tunnel);
    setTunnelConfigOpen(true);
  };

  const handleTunnelRoute = (tunnelId: string) => {
    const tunnel = getTunnelById(tunnelId);
    if (!tunnel) return;
    setSelectedTunnel(tunnel);
    setTunnelRouteOpen(true);
  };

  const handleDeleteTunnel = async (tunnelId: string) => {
    const tunnel = getTunnelById(tunnelId);
    if (!tunnel) return;

    const activeConnections = tunnel.connections?.length ?? 0;
    if (activeConnections > 0) {
      toast({
        title: "无法删除",
        description: `Tunnel ${tunnel.name} 有 ${activeConnections} 个活跃连接。请先断开所有连接后再删除。`,
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`确定要删除 Tunnel ${tunnel.name} 吗？此操作不可撤销！`)) return;

    const credentials = getActiveCredentials();
    if (!credentials) {
      toast({
        title: "缺少凭据",
        description: "请先登录账号",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const accountId = await resolveCloudflareAccountId();
      if (!accountId) {
        toast({
          title: "无法确定账号",
          description: "未找到可用的 Cloudflare 账号",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await invokeProviderApi<ProviderApiEnvelope<unknown>>(
        "auto",
        {
          action: "delete_tunnel",
          accountId,
          tunnelId,
        },
        credentials,
      );
      if (error) throw error;

      const envelope = unwrapProviderApiEnvelope(data);
      if (envelope?.success) {
        toast({
          title: "Tunnel 已删除",
          description: `${tunnel.name} 已成功删除`,
        });
        await loadTunnels();
      } else {
        throw new Error(envelope?.errors?.[0]?.message || "删除失败");
      }
    } catch (error) {
      console.error("Delete tunnel error:", error);
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "请确保 Tunnel 没有活跃连接和关联的路由",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCertificates = useCallback(async () => {
    const credentials = getActiveCredentials();
    const certificatesCapability = provider.capabilities.certificates;
    if (!credentials || !certificatesCapability || !selectedZone) return;

    setIsLoading(true);
    try {
      const list = await certificatesCapability.list(credentials, selectedZone);
      setCertificates(list);
    } catch (error) {
      console.error("Load certificates error:", error);
      // 静默处理，不显示错误提示
      setCertificates([]);
    } finally {
      setIsLoading(false);
    }
  }, [getActiveCredentials, provider.capabilities.certificates, selectedZone]);

  const loadPagesProjects = useCallback(async () => {
    const credentials = getActiveCredentials();
    const pagesCapability = provider.capabilities.pages;
    if (!credentials || !pagesCapability) return;

    setIsLoadingPages(true);
    try {
      const projects = await pagesCapability.list(credentials);
      setPagesProjects(projects.map(toLegacyPagesProject));
    } catch (error) {
      console.error("Load pages projects error:", error);
      handleProviderLoadError(error, "加载 Pages 项目失败");
    } finally {
      setIsLoadingPages(false);
    }
  }, [getActiveCredentials, handleProviderLoadError, provider.capabilities.pages]);

  const loadPagesDeployments = async (projectName: string) => {
    const email = getCookie("cf_email") || cfEmail;
    const apiKey = getCookie("cf_api_key") || cfApiKey;
    if (!email || !apiKey || zones.length === 0) return;

    const accountId = zones[0]?.account?.id;
    if (!accountId) return;

    setIsLoadingPages(true);
    try {
      const { data, error } = await supabase.functions.invoke("cloudflare-api", {
        body: {
          action: "list_pages_deployments",
          email,
          apiKey,
          accountId,
          projectName,
        },
      });

      if (error) throw error;

      if (data.success) {
        setPagesDeployments(data.result || []);
      } else {
        toast({
          title: "加载部署历史失败",
          description: data.errors?.[0]?.message || "未知错误",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Load pages deployments error:", error);
      toast({
        title: "加载失败",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPages(false);
    }
  };

  const verifyAndSaveCredentials = async (primary?: string, secret?: string) => {
    const activeProvider = providers[activeProviderId];
    if (!providerHasImplementedCapabilities(activeProviderId)) {
      toast({
        title: "暂未接入",
        description: `${activeProvider.label} 后端能力暂未接入`,
        variant: "destructive",
      });
      return;
    }

    const credentials = buildCredentialsFromFields(
      activeProviderId,
      primary ?? cfEmail,
      secret ?? cfApiKey,
    );

    if (!credentials) {
      toast({
        title: "请输入完整凭据",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      const zonesCapability = activeProvider.capabilities.zones;

      if (!zonesCapability) {
        toast({
          title: "暂未接入",
          description: `${activeProvider.label} 后端能力暂未接入`,
          variant: "destructive",
        });
        return;
      }

      if (credentials.provider === "cloudflare") {
        // 使用外部 Worker API 进行验证（通过 supabase-adapter）
        const { data, error } = await supabase.functions.invoke("verify-cloudflare", {
          body: {
            email: credentials.email,
            apiKey: credentials.apiKey,
          },
        });

        if (error) throw error;

        if (!data.success) {
          toast({
            title: "验证失败",
            description: data.error || "无法验证 Cloudflare 凭据",
            variant: "destructive",
          });
          return;
        }
      } else {
        await zonesCapability.list(credentials);
      }

      // 保存到多账号系统
      const account = saveAccount({
        provider: credentials.provider,
        label: getCredentialAccountLabel(credentials),
        credentials,
      });
      setCurrentAccount(account.id);
      setCurrentAccountId(account.id);

      // 更新状态
      setSavedAccounts(getAllAccounts());
      setHasCredentials(true);
      setCredentialFieldsFromAccount(account);

      toast({
        title: "凭据验证成功",
        description: "正在加载数据...",
      });

      await loadZones(credentials);
    } catch (error) {
      console.error("验证错误:", error);
      toast({
        title: "验证失败",
        description: error instanceof Error ? error.message : "无法连接验证服务，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // 切换账号
  const switchAccount = async (accountId: string) => {
    const account = savedAccounts.find((acc) => acc.id === accountId);
    if (!account) return;

    clearProviderResourceState();
    if (account.provider !== activeProviderId) {
      setActiveProviderId(account.provider);
      setSearchParams((previousParams) => {
        const nextParams = new URLSearchParams(previousParams);
        nextParams.set("provider", account.provider);
        return nextParams;
      });
    }

    // 更新账号信息
    setCurrentAccount(accountId);
    setCurrentAccountId(accountId);
    setCredentialFieldsFromAccount(account);

    // 刷新域名列表（使用新账号凭据）
    toast({
      title: "账号已切换",
      description: `正在加载 ${getAccountDisplayName(account)} 的数据...`,
    });

    const canLoad = providerHasImplementedCapabilities(account.provider);
    setHasCredentials(canLoad);
    if (canLoad) {
      await loadZones(account.credentials);
    }
  };

  // 删除账号
  const handleDeleteAccount = (accountId: string) => {
    const account = savedAccounts.find((acc) => acc.id === accountId);
    if (!account) return;

    const displayName = getAccountDisplayName(account);
    if (!confirm(`确定要删除账号 ${displayName} 吗？`)) return;

    const success = deleteAccount(accountId);
    if (success) {
      setSavedAccounts(getAllAccounts());

      // 如果删除的是当前账号，退出登录
      if (accountId === currentAccountId) {
        clearCloudflareCredentials();
        resetAllState();
        setCfEmail("");
        setCfApiKey("");
        setHasCredentials(false);
        setCurrentAccountId(null);
      }

      toast({
        title: "账号已删除",
        description: `${displayName} 已从列表中移除`,
      });
    }
  };

  // 添加新账号（切换到登录界面）
  const addNewAccount = () => {
    clearCloudflareCredentials();
    // 清除当前账号标记
    try {
      localStorage.removeItem("cf_current_account_id");
    } catch {
      // Ignore storage cleanup errors.
    }
    // 清除可能遗留的旧会话存储
    try {
      sessionStorage.removeItem("cf_email");
      sessionStorage.removeItem("cf_api_key");
    } catch {
      // Ignore storage cleanup errors.
    }
    resetAllState();
    setCfEmail("");
    setCfApiKey("");
    setHasCredentials(false);
    setCurrentAccountId(null);
  };

  const deleteZone = async (zoneId: string, zoneName: string) => {
    const email = getCookie("cf_email") || cfEmail;
    const apiKey = getCookie("cf_api_key") || cfApiKey;
    if (!email || !apiKey) return;

    setIsLoading(true);
    try {
      console.log("Deleting zone:", zoneId, zoneName);
      const { data, error } = await supabase.functions.invoke("cloudflare-api", {
        body: {
          action: "delete_zone",
          email,
          apiKey,
          zoneId,
        },
      });

      console.log("Delete zone response:", data);

      if (error) {
        console.error("Worker invoke error:", error);
        throw error;
      }

      if (data.success) {
        toast({
          title: "域名删除成功",
          description: `${zoneName} 已从 Cloudflare 删除`,
        });
        loadZones();
      } else {
        const errorMsg = data.errors?.[0]?.message || data.error || "未知错误";
        console.error("Cloudflare API error:", data.errors || data.error);
        toast({
          title: "删除失败",
          description: errorMsg,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Delete zone error:", error);
      const errorMessage = error instanceof Error ? error.message : "网络请求失败";
      toast({
        title: "删除失败",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadZones = useCallback(async (override?: ProviderCredentials | { email: string; apiKey: string }) => {
    const credentials = getActiveCredentials(override);
    const zonesCapability = credentials
      ? providers[credentials.provider].capabilities.zones
      : provider.capabilities.zones;
    if (!credentials || !zonesCapability) return;

    setIsLoading(true);
    try {
      const list = await zonesCapability.list(credentials);
      setZones(list.map(toLegacyZone));
    } catch (error) {
      console.error("Load zones error:", error);
      handleProviderLoadError(error, "加载域名失败");
    } finally {
      setIsLoading(false);
    }
  }, [getActiveCredentials, handleProviderLoadError, provider.capabilities.zones]);

  // 初始化时加载保存的账号和当前账号
  useEffect(() => {
    if (hasInitializedAccountRef.current) return;
    hasInitializedAccountRef.current = true;

    // 加载所有保存的账号
    const accounts = getAllAccounts();
    setSavedAccounts(accounts);

    // 尝试恢复当前账号
    const currentAcc = getCurrentAccount();

    // 迁移旧的 sessionStorage 或 cookie 凭据到新的账号系统，仅适用于 Cloudflare。
    const oldEmail = sessionStorage.getItem("cf_email");
    const oldApiKey = sessionStorage.getItem("cf_api_key");
    const cookieEmail = getCookie("cf_email");
    const cookieApiKey = getCookie("cf_api_key");

    if (activeProviderId === "cloudflare" && oldEmail && oldApiKey) {
      // 迁移 sessionStorage
      const migratedAccount = saveAccount(oldEmail, oldApiKey);
      setCurrentAccount(migratedAccount.id);
      setCurrentAccountId(migratedAccount.id);

      sessionStorage.removeItem("cf_email");
      sessionStorage.removeItem("cf_api_key");

      setCfEmail(oldEmail);
      setCfApiKey(oldApiKey);
      setHasCredentials(true);

      setSavedAccounts([...accounts, migratedAccount]);

      setTimeout(() => loadZones({ email: oldEmail, apiKey: oldApiKey }), 100);
      void loadWorkersHiddenSetting();
      return;
    }

    if (activeProviderId === "cloudflare" && cookieEmail && cookieApiKey && !currentAcc) {
      // 迁移 cookie 到账号系统
      const migratedAccount = saveAccount(cookieEmail, cookieApiKey);
      setCurrentAccount(migratedAccount.id);
      setCurrentAccountId(migratedAccount.id);

      setCfEmail(cookieEmail);
      setCfApiKey(cookieApiKey);
      setHasCredentials(true);

      setSavedAccounts([...accounts, migratedAccount]);

      setTimeout(() => loadZones({ email: cookieEmail, apiKey: cookieApiKey }), 100);
      void loadWorkersHiddenSetting();
      return;
    }

    if (currentAcc?.provider === activeProviderId) {
      // 使用保存的当前账号
      setCredentialFieldsFromAccount(currentAcc);
      setHasCredentials(true);
      setCurrentAccountId(currentAcc.id);

      if (providerHasImplementedCapabilities(currentAcc.provider)) {
        setTimeout(() => loadZones(currentAcc.credentials), 100);
      }
      if (currentAcc.provider === "cloudflare") {
        void loadWorkersHiddenSetting();
      }
    }
  }, [activeProviderId, loadZones, loadWorkersHiddenSetting]);

  const loadWorkerBindings = async (workerId: string, accountId: string) => {
    const email = cfEmail || getCookie("cf_email");
    const apiKey = cfApiKey || getCookie("cf_api_key");
    if (!email || !apiKey) return;

    try {
      const { data, error } = await supabase.functions.invoke("cloudflare-api", {
        body: {
          action: "get_worker_bindings",
          email,
          apiKey,
          accountId,
          scriptName: workerId,
        },
      });

      if (error) throw error;

      if (data.success) {
        const r = data.result;
        const bindings = Array.isArray(r) ? r : r?.bindings || [];
        setWorkerBindings(bindings);
      } else {
        setWorkerBindings([]);
      }
    } catch (error) {
      console.error("Load worker bindings error:", error);
      setWorkerBindings([]);
    }
  };

  const loadDNSRecords = useCallback(async (zoneId: string) => {
    const credentials = getActiveCredentials();
    const dnsCapability = provider.capabilities.dns;
    if (!credentials || !dnsCapability || !zoneId) return;

    setIsLoading(true);
    try {
      // 加载DNS记录
      const records = await dnsCapability.list(credentials, zoneId);
      setDnsRecords(records.map(toLegacyDnsRecord));

      if (credentials.provider === "cloudflare") {
        // 加载Worker路由
        const { data: routesData, error: routesError } = await invokeProviderApi<ProviderApiEnvelope<WorkerRoute[]>>(
          "auto",
          {
            action: "list_worker_routes",
            zoneId,
          },
          credentials,
        );

        const routes = !routesError ? unwrapProviderApiResult(routesData) : undefined;
        setWorkerRoutes(routes ?? []);
      } else {
        setWorkerRoutes([]);
      }
    } catch (error) {
      console.error("Load DNS records error:", error);
      handleProviderLoadError(error, "加载 DNS 记录失败");
    } finally {
      setIsLoading(false);
    }
  }, [getActiveCredentials, handleProviderLoadError, provider.capabilities.dns]);

  const loadZoneSettings = async (zoneId: string) => {
    const email = getCookie("cf_email") || cfEmail;
    const apiKey = getCookie("cf_api_key") || cfApiKey;
    if (!email || !apiKey) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cloudflare-api", {
        body: {
          action: "get_zone_settings",
          email,
          apiKey,
          zoneId,
        },
      });

      if (error) throw error;

      if (data.success && data.result) {
        // 查找 SSL 设置
        const sslSetting = data.result.find((setting: ZoneSetting) => setting.id === "ssl");
        if (sslSetting) {
          setSslMode(sslSetting.value);
        }

        // 查找 Always Use HTTPS 设置
        const alwaysHttpsSetting = data.result.find((setting: ZoneSetting) => setting.id === "always_use_https");
        if (alwaysHttpsSetting) {
          setAlwaysUseHttps(alwaysHttpsSetting.value === "on");
        }

        // 查找 Automatic HTTPS Rewrites 设置
        const autoHttpsSetting = data.result.find((setting: ZoneSetting) => setting.id === "automatic_https_rewrites");
        if (autoHttpsSetting) {
          setAutomaticHttpsRewrites(autoHttpsSetting.value === "on");
        }

        // 查找 HSTS 设置
        const hstsSetting = data.result.find((setting: ZoneSetting) => setting.id === "security_header");
        if (hstsSetting && hstsSetting.value?.strict_transport_security) {
          setHstsEnabled(hstsSetting.value.strict_transport_security.enabled === true);
        }

        // 查找随机加密设置
        const oppEncSetting = data.result.find((setting: ZoneSetting) => setting.id === "opportunistic_encryption");
        if (oppEncSetting) {
          setOpportunisticEncryption(oppEncSetting.value === "on");
        }

        // 查找 TLS 1.3 设置
        const tls13Setting = data.result.find((setting: ZoneSetting) => setting.id === "tls_1_3");
        if (tls13Setting) {
          setTls13(tls13Setting.value === "on");
        }

        // 查找缓存级别设置
        const cacheLevelSetting = data.result.find((setting: ZoneSetting) => setting.id === "cache_level");
        if (cacheLevelSetting) {
          setCacheLevel(cacheLevelSetting.value);
        }

        // 查找浏览器缓存 TTL 设置
        const browserCacheSetting = data.result.find((setting: ZoneSetting) => setting.id === "browser_cache_ttl");
        if (browserCacheSetting) {
          setBrowserCacheTtl(browserCacheSetting.value);
        }

        // 查找 Always Online 设置
        const alwaysOnlineSetting = data.result.find((setting: ZoneSetting) => setting.id === "always_online");
        if (alwaysOnlineSetting) {
          setAlwaysOnline(alwaysOnlineSetting.value === "on");
        }
      }

      // 单独获取开发模式状态
      const devModeResponse = await supabase.functions.invoke("cloudflare-api", {
        body: {
          action: "get_development_mode",
          email,
          apiKey,
          zoneId,
        },
      });

      if (devModeResponse.data?.success && devModeResponse.data?.result) {
        setDevelopmentMode(devModeResponse.data.result.value === "on");
      }
    } catch (error) {
      console.error("Load zone settings error:", error);
      toast({
        title: "加载设置失败",
        description: "无法获取 SSL/TLS 设置",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateDevelopmentMode = async (enabled: boolean) => {
    const email = getCookie("cf_email") || cfEmail;
    const apiKey = getCookie("cf_api_key") || cfApiKey;
    if (!email || !apiKey || !selectedZone) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cloudflare-api", {
        body: {
          action: "update_development_mode",
          email,
          apiKey,
          zoneId: selectedZone,
          settings: enabled ? "on" : "off",
        },
      });

      if (error) throw error;

      if (data.success) {
        setDevelopmentMode(enabled);
        toast({
          title: enabled ? "开发模式已启用" : "开发模式已禁用",
          description: enabled ? "缓存将暂时被绕过（3小时后自动关闭）" : "缓存已恢复正常",
        });
      } else {
        throw new Error(data.errors?.[0]?.message || "更新失败");
      }
    } catch (error) {
      console.error("Update development mode error:", error);
      toast({
        title: "更新失败",
        description: error instanceof Error ? error.message : "无法更新开发模式",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateAlwaysOnline = async (enabled: boolean) => {
    const email = getCookie("cf_email") || cfEmail;
    const apiKey = getCookie("cf_api_key") || cfApiKey;
    if (!email || !apiKey || !selectedZone) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cloudflare-api", {
        body: {
          action: "update_zone_settings",
          email,
          apiKey,
          zoneId: selectedZone,
          settings: [
            {
              id: "always_online",
              value: enabled ? "on" : "off",
            },
          ],
        },
      });

      if (error) throw error;

      if (data.success) {
        setAlwaysOnline(enabled);
        toast({
          title: enabled ? "宕机在线已启用" : "宕机在线已禁用",
          description: enabled ? "Cloudflare 将在服务器宕机时提供缓存版本" : "宕机在线功能已关闭",
        });
      } else {
        throw new Error(data.errors?.[0]?.message || "更新失败");
      }
    } catch (error) {
      console.error("Update always online error:", error);
      toast({
        title: "更新失败",
        description: errorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const purgeAllCache = async () => {
    const email = getCookie("cf_email") || cfEmail;
    const apiKey = getCookie("cf_api_key") || cfApiKey;
    if (!email || !apiKey || !selectedZone) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cloudflare-api", {
        body: {
          action: "purge_cache",
          email,
          apiKey,
          zoneId: selectedZone,
          purgeData: {
            purge_everything: true,
          },
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "缓存已清除",
          description: "所有缓存内容已从边缘服务器清除",
        });
      } else {
        throw new Error(data.errors?.[0]?.message || "清除失败");
      }
    } catch (error) {
      console.error("Purge all cache error:", error);
      toast({
        title: "清除失败",
        description: error instanceof Error ? error.message : "无法清除缓存",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadFirewallRules = async (zoneId: string) => {
    const email = getCookie("cf_email") || cfEmail;
    const apiKey = getCookie("cf_api_key") || cfApiKey;
    if (!email || !apiKey) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cloudflare-api", {
        body: {
          action: "list_firewall_rules",
          email,
          apiKey,
          zoneId,
        },
      });

      if (error) throw error;

      if (data.success) {
        const rules = data.result || [];
        console.log("Loaded firewall rules:", JSON.stringify(rules.slice(0, 2), null, 2)); // 打印前2条规则用于调试
        setFirewallRules(rules);
        if (data.rulesetId) {
          setFirewallRulesetId(data.rulesetId);
        }
      } else {
        // 检查是否是规则集不存在的错误
        const errorMsg = data.errors?.[0]?.message || "";
        if (errorMsg.includes("could not find entrypoint ruleset") || errorMsg.includes("entrypoint")) {
          // 规则集未创建，设置空数组但不显示错误
          setFirewallRules([]);
          setFirewallRulesetId("");
        } else {
          toast({
            title: "加载防火墙规则失败",
            description: errorMsg || "未知错误",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Load firewall rules error:", error);
      // 静默处理，设置空规则列表
      setFirewallRules([]);
      setFirewallRulesetId("");
    } finally {
      setIsLoading(false);
    }
  };

  const loadRateLimitRules = async (zoneId: string) => {
    const email = getCookie("cf_email") || cfEmail;
    const apiKey = getCookie("cf_api_key") || cfApiKey;
    if (!email || !apiKey) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cloudflare-api", {
        body: {
          action: "list_rate_limit_rules",
          email,
          apiKey,
          zoneId,
        },
      });

      if (error) throw error;

      if (data.success) {
        const rules = data.result?.rules || [];
        setRateLimitRules(rules);
        setRateLimitRulesetId(data.rulesetId || data.result?.id || "");
      } else {
        const errorMsg = data.errors?.[0]?.message || "";
        if (errorMsg.includes("could not find") || errorMsg.includes("entrypoint")) {
          setRateLimitRules([]);
          setRateLimitRulesetId("");
        } else {
          toast({
            title: "加载速率限制规则失败",
            description: errorMsg || "未知错误",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Load rate limit rules error:", error);
      setRateLimitRules([]);
      setRateLimitRulesetId("");
    } finally {
      setIsLoading(false);
    }
  };

  const createFirewallRule = async () => {
    const email = getCookie("cf_email") || cfEmail;
    const apiKey = getCookie("cf_api_key") || cfApiKey;
    if (!email || !apiKey || !selectedZone) return;

    // 验证输入
    if (newFirewallRule.type === "custom") {
      if (!newFirewallRule.customExpression?.trim()) {
        toast({
          title: "输入不能为空",
          description: "请输入自定义表达式",
          variant: "destructive",
        });
        return;
      }
    } else {
      if (!newFirewallRule.value.trim()) {
        toast({
          title: "输入不能为空",
          description: "请输入规则内容",
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);
    try {
      // 构建防火墙规则表达式
      let expression = "";
      let description = "";

      if (newFirewallRule.type === "custom") {
        expression = newFirewallRule.customExpression!.trim();
        description = newFirewallRule.description || "自定义防火墙规则";
      } else {
        const value = newFirewallRule.value.trim();
        if (newFirewallRule.type === "ip") {
          expression = `ip.src eq ${value}`;
        } else if (newFirewallRule.type === "country") {
          expression = `ip.geoip.country eq "${value}"`;
        } else if (newFirewallRule.type === "asn") {
          expression = `ip.geoip.asnum eq ${value}`;
        }
        description = `${newFirewallRule.type} ${newFirewallRule.action} rule for ${value}`;
      }

      const ruleData = {
        action: newFirewallRule.action,
        expression: expression,
        description: description,
        enabled: true,
      };

      const { data, error } = await supabase.functions.invoke("cloudflare-api", {
        body: {
          action: "create_firewall_rule",
          email,
          apiKey,
          zoneId: selectedZone,
          ruleData,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "防火墙规则已创建",
          description: "规则已生效",
        });
        setNewFirewallRule({ type: "ip", action: "block", value: "" });
        setShowExpressionExamples(false);
        loadFirewallRules(selectedZone);
      } else {
        throw new Error(data.errors?.[0]?.message || "创建失败");
      }
    } catch (error) {
      console.error("Create firewall rule error:", error);
      toast({
        title: "创建失败",
        description: error instanceof Error ? error.message : "无法创建防火墙规则",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteFirewallRule = async (ruleId: string) => {
    const email = getCookie("cf_email") || cfEmail;
    const apiKey = getCookie("cf_api_key") || cfApiKey;
    if (!email || !apiKey || !selectedZone) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cloudflare-api", {
        body: {
          action: "delete_firewall_rule",
          email,
          apiKey,
          zoneId: selectedZone,
          ruleId,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "防火墙规则已删除",
        });
        loadFirewallRules(selectedZone);
      } else {
        throw new Error(data.errors?.[0]?.message || "删除失败");
      }
    } catch (error) {
      console.error("Delete firewall rule error:", error);
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "无法删除防火墙规则",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateFirewallRule = async () => {
    const email = getCookie("cf_email") || cfEmail;
    const apiKey = getCookie("cf_api_key") || cfApiKey;
    if (!email || !apiKey || !selectedZone || !editingFirewallRule) return;

    if (!newFirewallRule.value.trim()) {
      toast({
        title: "输入不能为空",
        description: "请输入规则内容",
        variant: "destructive",
      });
      return;
    }

    // 检查 filterId 是否存在
    const filterId = editingFirewallRule.filter?.id;
    if (!filterId) {
      console.error("Missing filter ID in rule:", editingFirewallRule);
      toast({
        title: "无法更新规则",
        description: "规则数据不完整，请删除后重新创建",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // 构建防火墙规则表达式
      let expression = "";
      const value = newFirewallRule.value.trim();

      if (newFirewallRule.type === "ip") {
        expression = `ip.src eq ${value}`;
      } else if (newFirewallRule.type === "country") {
        expression = `ip.geoip.country eq "${value}"`;
      } else if (newFirewallRule.type === "asn") {
        expression = `ip.geoip.asnum eq ${value}`;
      }

      const ruleData = {
        action: newFirewallRule.action,
        expression: expression,
        description: `${newFirewallRule.type} ${newFirewallRule.action} rule for ${value}`,
        paused: editingFirewallRule.paused === true,
        filterId: filterId,
      };

      const { data, error } = await supabase.functions.invoke("cloudflare-api", {
        body: {
          action: "update_firewall_rule",
          email,
          apiKey,
          zoneId: selectedZone,
          ruleId: editingFirewallRule.id,
          ruleData,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "防火墙规则已更新",
          description: "规则已生效",
        });
        setNewFirewallRule({ type: "ip", action: "block", value: "" });
        setEditingFirewallRule(null);
        loadFirewallRules(selectedZone);
      } else {
        throw new Error(data.errors?.[0]?.message || "更新失败");
      }
    } catch (error) {
      console.error("Update firewall rule error:", error);
      toast({
        title: "更新失败",
        description: error instanceof Error ? error.message : "无法更新防火墙规则",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFirewallRule = async (rule: FirewallRule) => {
    const email = getCookie("cf_email") || cfEmail;
    const apiKey = getCookie("cf_api_key") || cfApiKey;
    if (!email || !apiKey || !selectedZone) return;

    // 检查 filterId 是否存在
    const filterId = rule.filter?.id;
    if (!filterId) {
      console.error("Missing filter ID, cannot toggle rule:", rule);
      toast({
        title: "操作失败",
        description: "规则数据不完整，请删除后重新创建",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // 明确判断当前状态，避免 undefined 导致的问题
      const currentPausedState = rule.paused === true;
      const newPausedState = !currentPausedState;
      const expression = rule.filter?.expression || rule.expression;

      console.log("Toggle rule:", {
        ruleId: rule.id,
        currentPaused: currentPausedState,
        newPaused: newPausedState,
        filterId: filterId,
      });

      const ruleData = {
        action: rule.action,
        expression: expression,
        description: rule.description,
        paused: newPausedState,
        filterId: filterId,
      };

      const { data, error } = await supabase.functions.invoke("cloudflare-api", {
        body: {
          action: "update_firewall_rule",
          email,
          apiKey,
          zoneId: selectedZone,
          ruleId: rule.id,
          ruleData,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: newPausedState ? "规则已停止" : "规则已启动",
          description: newPausedState ? "该规则已暂停" : "该规则已生效",
        });
        // 刷新列表
        await loadFirewallRules(selectedZone);
      } else {
        throw new Error(data.errors?.[0]?.message || "切换失败");
      }
    } catch (error) {
      console.error("Toggle firewall rule error:", error);
      toast({
        title: "操作失败",
        description: error instanceof Error ? error.message : "无法切换规则状态",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const purgeUrlCache = async () => {
    const email = getCookie("cf_email") || cfEmail;
    const apiKey = getCookie("cf_api_key") || cfApiKey;
    if (!email || !apiKey || !selectedZone) return;

    if (!purgeUrl.trim()) {
      toast({
        title: "输入不能为空",
        description: "请输入要清除的内容",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      let purgeData: Record<string, string[]> = {};
      const inputValue = purgeUrl.trim();

      // 根据类型构建不同的 purgeData
      switch (purgeType) {
        case "url": {
          // 如果用户没有输入协议，自动添加 https://
          const urlValue =
            inputValue.startsWith("http://") || inputValue.startsWith("https://")
              ? inputValue
              : `https://${inputValue}`;
          purgeData = { files: [urlValue] };
          break;
        }
        case "host":
          purgeData = { hosts: [inputValue] };
          break;
        case "tag":
          purgeData = { tags: [inputValue] };
          break;
        case "prefix": {
          // 如果用户没有输入协议，自动添加 https://
          const prefixValue =
            inputValue.startsWith("http://") || inputValue.startsWith("https://")
              ? inputValue
              : `https://${inputValue}`;
          purgeData = { prefixes: [prefixValue] };
          break;
        }
      }

      const { data, error } = await supabase.functions.invoke("cloudflare-api", {
        body: {
          action: "purge_cache",
          email,
          apiKey,
          zoneId: selectedZone,
          purgeData,
        },
      });

      if (error) throw error;

      if (data.success) {
        setPurgeUrl("");
        const typeNames = {
          url: "URL",
          host: "主机",
          tag: "标签",
          prefix: "前缀",
        };
        toast({
          title: "缓存已清除",
          description: `${typeNames[purgeType]} ${inputValue} 的缓存已清除`,
        });
      } else {
        throw new Error(data.errors?.[0]?.message || "清除失败");
      }
    } catch (error) {
      console.error("Purge cache error:", error);
      toast({
        title: "清除失败",
        description: error instanceof Error ? error.message : "无法清除缓存",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadWorkers = useCallback(async () => {
    const credentials = getActiveCredentials();
    const workersCapability = provider.capabilities.workers;
    if (!credentials || !workersCapability) return;

    setIsLoading(true);
    try {
      const workersList = (await workersCapability.list(credentials)).map(toLegacyWorker);
      setWorkers(workersList);

      if (credentials.provider !== "cloudflare") {
        setWorkerSubdomain("");
        setAllWorkerBindings({});
        return;
      }

      let accountId = zones[0]?.account?.id;

      if (!accountId) {
        const zonesCapability = provider.capabilities.zones;
        if (zonesCapability) {
          const zoneList = await zonesCapability.list(credentials);
          const legacyZones = zoneList.map(toLegacyZone);
          accountId = legacyZones[0]?.account?.id;
          setZones(legacyZones);
        }
      }

      if (!accountId) {
        throw new ProviderError(activeProviderId, "NOT_FOUND", "无法获取账户信息");
      }

      // 获取 workers.dev subdomain
      const { data: subdomainData, error: subdomainError } = await invokeProviderApi<
        ProviderApiEnvelope<{ subdomain?: string }>
      >(
        "auto",
        {
          action: "get_workers_subdomain",
          accountId: accountId,
        },
        credentials,
      );

      const subdomainResult = !subdomainError ? unwrapProviderApiResult(subdomainData) : undefined;
      if (subdomainResult?.subdomain) {
        const subdomain = subdomainResult.subdomain;
        setWorkerSubdomain(subdomain);
        setCookie("cf_worker_subdomain", subdomain, 30); // 保存到 cookie
      } else if (!workerSubdomain) {
        // 如果 API 调用失败且没有缓存，使用 accountId 前8位作为占位符
        setWorkerSubdomain(accountId.slice(0, 8));
      }

      // 为每个 Worker 加载 bindings
      if (accountId && workersList.length > 0) {
        // 先加载 D1 数据库和 KV 命名空间列表
        const [d1Response, kvResponse] = await Promise.all([
          invokeProviderApi<ProviderApiEnvelope<D1DatabaseSummary[]>>(
            "auto",
            { action: "list_d1_databases", accountId },
            credentials,
          ),
          invokeProviderApi<ProviderApiEnvelope<KVNamespaceSummary[]>>(
            "auto",
            { action: "list_kv_namespaces", accountId },
            credentials,
          ),
        ]);

        // 创建ID到名称的映射
        const d1Map: Record<string, string> = {};
        const kvMap: Record<string, string> = {};

        const d1List = !d1Response.error ? unwrapProviderApiResult(d1Response.data) : undefined;
        const kvList = !kvResponse.error ? unwrapProviderApiResult(kvResponse.data) : undefined;

        (d1List ?? []).forEach((db) => {
          d1Map[db.uuid] = db.name;
        });

        (kvList ?? []).forEach((ns) => {
          kvMap[ns.id] = ns.title;
        });

        const bindingsMap: Record<string, WorkerBinding[]> = {};
        await Promise.all(
          workersList.map(async (worker: Worker) => {
            try {
              const { data: bindingsData, error: bindingsError } = await invokeProviderApi<
                ProviderApiEnvelope<WorkerBinding[] | { bindings?: WorkerBinding[] }>
              >(
                "auto",
                {
                  action: "get_worker_bindings",
                  accountId,
                  scriptName: worker.id,
                },
                credentials,
              );

              const bindingsResult = !bindingsError ? unwrapProviderApiResult(bindingsData) : undefined;
              if (bindingsResult) {
                // Cloudflare API 返回的是数组，不是嵌套的对象
                let bindings = Array.isArray(bindingsResult)
                  ? bindingsResult
                  : bindingsResult.bindings || [];

                // 增强bindings，添加真实的数据库/命名空间名称
                bindings = bindings.map((binding: WorkerBinding) => {
                  if (binding.type === "d1" && binding.database_id) {
                    return { ...binding, realName: d1Map[binding.database_id] || binding.name };
                  } else if (binding.type === "kv_namespace" && binding.namespace_id) {
                    return { ...binding, realName: kvMap[binding.namespace_id] || binding.name };
                  }
                  return binding;
                });

                bindingsMap[worker.id] = bindings;
              }
            } catch (error) {
              console.error(`Error loading bindings for ${worker.id}:`, error);
            }
          }),
        );
        setAllWorkerBindings(bindingsMap);
      } else {
        setAllWorkerBindings({});
      }
    } catch (error) {
      console.error("Load workers error:", error);
      handleProviderLoadError(error, "加载 Workers 失败");
    } finally {
      setIsLoading(false);
    }
  }, [
    activeProviderId,
    getActiveCredentials,
    handleProviderLoadError,
    provider.capabilities.workers,
    provider.capabilities.zones,
    workerSubdomain,
    zones,
  ]);

  const loadAnalytics = useCallback(async (zoneId: string, period: AnalyticsPeriod = analyticsPeriod) => {
    const credentials = getActiveCredentials();
    const analyticsCapability = provider.capabilities.analytics;
    if (!credentials || !analyticsCapability || !zoneId) return;

    setIsLoading(true);
    try {
      const points = await analyticsCapability.fetch(credentials, zoneId, period);
      setAnalyticsPoints(points);
      toast({
        title: "数据加载成功",
        description: "分析数据已更新",
      });
      console.log("Analytics data:", points);
    } catch (error) {
      console.error("Load analytics error:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      toast({
        title: "加载失败",
        description: errorMsg,
        variant: "destructive",
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(errorMsg);
              toast({ title: "已复制错误信息" });
            }}
          >
            复制
          </Button>
        ),
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    analyticsPeriod,
    getActiveCredentials,
    provider.capabilities.analytics,
    toast,
  ]);

  // 首次进入各能力视图时加载对应资源列表
  useEffect(() => {
    if (activeView === "page-rules" && selectedZone) {
      void loadPageRules();
    }
  }, [activeView, selectedZone, loadPageRules]);

  useEffect(() => {
    if (activeView === "kv-storage") {
      void loadKvNamespaces();
    }
  }, [activeView, loadKvNamespaces]);

  useEffect(() => {
    if (activeView === "analytics" && selectedZone) {
      void loadAnalytics(selectedZone);
    }
  }, [activeView, selectedZone, loadAnalytics]);

  useEffect(() => {
    if (activeView === "pages") {
      void loadPagesProjects();
    }
  }, [activeView, loadPagesProjects]);

  useEffect(() => {
    if (activeView === "certificates" && selectedZone) {
      void loadCertificates();
    }
  }, [activeView, selectedZone, loadCertificates]);

  const deleteDNSRecord = async (zoneId: string, recordId: string) => {
    if (!confirm("确定要删除这条 DNS 记录吗？")) return;

    const email = getCookie("cf_email") || cfEmail;
    const apiKey = getCookie("cf_api_key") || cfApiKey;
    if (!email || !apiKey) return;

    try {
      const { data, error } = await supabase.functions.invoke("cloudflare-api", {
        body: {
          action: "delete_dns_record",
          email,
          apiKey,
          zoneId,
          recordId,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "删除成功",
        });

        // 记录操作历史
        const record = dnsRecords.find((r) => r.id === recordId);
        recordOperation({
          userId: email,
          operationType: "delete",
          resourceType: "dns_record",
          resourceName: record ? `${record.type} ${record.name}` : recordId,
          zoneId: zoneId,
          actionDetails: record ? `删除 ${record.type} 记录: ${record.name}` : "删除 DNS 记录",
        });

        loadDNSRecords(zoneId);
      }
    } catch (error) {
      console.error("Delete DNS record error:", error);
      toast({
        title: "删除失败",
        variant: "destructive",
      });
    }
  };

  const updateZoneSetting = async (settingId: string, value: unknown) => {
    const email = getCookie("cf_email") || cfEmail;
    const apiKey = getCookie("cf_api_key") || cfApiKey;
    if (!email || !apiKey || !selectedZone) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cloudflare-api", {
        body: {
          action: "update_zone_settings",
          email,
          apiKey,
          zoneId: selectedZone,
          settings: [
            {
              id: settingId,
              value: value,
            },
          ],
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "设置更新成功",
        });
        // 重新加载设置
        await loadZoneSettings(selectedZone);
      } else {
        throw new Error(data.errors?.[0]?.message || "更新失败");
      }
    } catch (error) {
      console.error("Update zone setting error:", error);
      toast({
        title: "更新失败",
        description: error instanceof Error ? error.message : "无法更新设置",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateHstsSetting = async (enabled: boolean) => {
    const email = getCookie("cf_email") || cfEmail;
    const apiKey = getCookie("cf_api_key") || cfApiKey;
    if (!email || !apiKey || !selectedZone) return;

    setIsLoading(true);
    try {
      const hstsValue = {
        strict_transport_security: {
          enabled: enabled,
          max_age: enabled ? 31536000 : 0,
          include_subdomains: enabled,
          preload: enabled,
          nosniff: enabled,
        },
      };

      const { data, error } = await supabase.functions.invoke("cloudflare-api", {
        body: {
          action: "update_zone_settings",
          email,
          apiKey,
          zoneId: selectedZone,
          settings: [
            {
              id: "security_header",
              value: hstsValue,
            },
          ],
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "HSTS 设置更新成功",
        });
        await loadZoneSettings(selectedZone);
      } else {
        throw new Error(data.errors?.[0]?.message || "更新失败");
      }
    } catch (error) {
      console.error("Update HSTS setting error:", error);
      toast({
        title: "更新失败",
        description: error instanceof Error ? error.message : "无法更新 HSTS 设置",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteWorker = async (workerId: string, workerName: string) => {
    // 打开确认对话框
    setWorkerToDelete({ id: workerId, name: workerName });
    setDeleteConfirmInput("");
    setDeleteDialogOpen(true);
  };

  const confirmDeleteWorker = async () => {
    if (!workerToDelete) return;

    // 验证用户输入的名称是否匹配
    if (deleteConfirmInput !== workerToDelete.id) {
      toast({
        title: "名称不匹配",
        description: `请输入正确的 Worker 名称: ${workerToDelete.id}`,
        variant: "destructive",
      });
      return;
    }

    const email = getCookie("cf_email") || cfEmail;
    const apiKey = getCookie("cf_api_key") || cfApiKey;
    if (!email || !apiKey) return;

    setIsLoading(true);
    setDeleteDialogOpen(false);

    try {
      // 1. 获取账户 ID
      let accountId = zones[0]?.account?.id;
      if (!accountId) {
        const { data: zonesData } = await supabase.functions.invoke("cloudflare-api", {
          body: { action: "list_zones", email, apiKey },
        });
        if (zonesData?.success && zonesData.result?.length > 0) {
          accountId = zonesData.result[0]?.account?.id;
        }
      }

      if (!accountId) {
        throw new Error("无法获取账户信息");
      }

      // 2. 将 worker 名称转换回域名格式
      const domainName = workerToDelete.id.replace(/-/g, ".");

      // 3. 找到匹配的 zone
      const { data: zonesData } = await supabase.functions.invoke("cloudflare-api", {
        body: { action: "list_zones", email, apiKey },
      });

      if (!zonesData?.success || !zonesData.result) {
        throw new Error("无法获取域名列表");
      }

      const matchedZone = (zonesData.result as CloudflareZone[]).find((zone) => domainName.endsWith(zone.name));

      if (matchedZone) {
        const zoneId = matchedZone.id;
        const zoneName = matchedZone.name;

        // 4. 删除 Worker 路由
        const { data: routesData } = await supabase.functions.invoke("cloudflare-api", {
          body: {
            action: "list_worker_routes",
            email,
            apiKey,
            zoneId,
          },
        });

        if (routesData?.success && routesData.result) {
          for (const route of routesData.result) {
            if (route.script === workerToDelete.id) {
              await supabase.functions.invoke("cloudflare-api", {
                body: {
                  action: "delete_worker_route",
                  email,
                  apiKey,
                  zoneId,
                  routeId: route.id,
                },
              });
              console.log("删除路由成功:", route.pattern);
            }
          }
        }

        // 5. 删除 DNS 记录（如果是子域名）
        if (domainName !== zoneName) {
          const { data: dnsData } = await supabase.functions.invoke("cloudflare-api", {
            body: {
              action: "list_dns_records",
              email,
              apiKey,
              zoneId,
            },
          });

          if (dnsData?.success && dnsData.result) {
            for (const record of dnsData.result) {
              if (record.type === "CNAME" && record.name === domainName) {
                await supabase.functions.invoke("cloudflare-api", {
                  body: {
                    action: "delete_dns_record",
                    email,
                    apiKey,
                    zoneId,
                    recordId: record.id,
                  },
                });
                console.log("删除 DNS 记录成功:", record.name);
              }
            }
          }
        }
      }

      // 6. 删除 Worker
      const { data, error } = await supabase.functions.invoke("cloudflare-api", {
        body: {
          action: "delete_worker",
          email,
          apiKey,
          accountId,
          workerId: workerToDelete.id,
        },
      });

      if (error) throw error;

      // 如果 Worker 不存在（错误代码 10007），也认为删除成功
      const workerNotFound = data?.errors?.some((e: CloudflareApiError) => e.code === 10007);

      if (data.success || workerNotFound) {
        toast({
          title: "删除成功",
          description: workerNotFound ? "Worker 已不存在，相关资源已清理" : "Worker 及相关资源已删除",
        });

        // 记录操作历史
        recordOperation({
          userId: email,
          operationType: "delete",
          resourceType: "worker",
          resourceName: workerToDelete.id,
          actionDetails: `删除 Worker: ${workerToDelete.id}`,
        });

        setWorkerToDelete(null);
        setDeleteConfirmInput("");
        loadWorkers();
      } else {
        throw new Error(data.errors?.[0]?.message || data.error || "删除失败");
      }
    } catch (error) {
      console.error("Delete worker error:", error);
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sidebarItems = buildSidebarItems(activeProviderId, providers);
  const sidebarItemByKey = new Map<CapabilitySidebarKey, SidebarItem>(
    sidebarItems.map((item) => [item.key, item]),
  );

  const handleCapabilitySidebarItemClick = (item: SidebarItem) => {
    setActiveView(item.view);

    switch (item.key) {
      case "zones":
        loadZones();
        break;
      case "dns":
        loadDNSRecords(selectedZone);
        setDnsNavClicks((clicks) => clicks + 1);
        break;
      case "workers":
        loadWorkers();
        break;
      case "analytics":
        loadAnalytics(selectedZone);
        break;
      case "certificates":
        if (selectedZone) loadCertificates();
        break;
      case "pages":
        loadPagesProjects();
        break;
      case "r2":
        loadR2Buckets();
        break;
      case "d1":
        loadD1Databases();
        break;
      case "tunnels":
        loadTunnels();
        break;
    }
  };

  const renderCapabilitySidebarItem = (
    key: CapabilitySidebarKey,
    expectedScope?: SidebarItem["scope"],
  ) => {
    const item = sidebarItemByKey.get(key);
    if (expectedScope && item?.scope !== expectedScope) return null;
    if (!item || (item.key === "workers" && !showWorkers)) return null;

    const Icon = CAPABILITY_ICON_BY_KEY[item.key];
    return (
      <SidebarMenuItem key={item.key}>
        <SidebarMenuButton
          onClick={() => handleCapabilitySidebarItemClick(item)}
          isActive={activeView === item.view}
        >
          <Icon className="w-4 h-4" />
          <span>{item.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  // 凭据输入界面
  if (!hasCredentials) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <header className="border-b border-border/40 backdrop-blur-sm bg-card/50">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2 text-foreground">
                  <img src={spiderIcon} alt="Spider" className="w-8 h-8" />
                  <span>蜘蛛网络</span>
                </h1>
                <p className="text-xs text-muted-foreground">好用的Cloudflare管理工具</p>
              </div>
            </div>
          </div>
        </header>

        <section className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                连接您的 {provider.label} 账号
              </h2>
              <p className="text-muted-foreground">
                {activeProviderAccounts.length > 0
                  ? `选择已保存的 ${provider.label} 账号或添加新账号`
                  : `输入凭据后即可管理 ${provider.label}`}
              </p>
              <div className="mt-4 flex justify-center">
                <ProviderSwitcher active={activeProviderId} onChange={handleProviderChange} />
              </div>
            </div>

            {/* 已保存的账号列表 */}
            {activeProviderAccounts.length > 0 && (
              <div className="mb-6">
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="text-sm">已保存的 {provider.label} 账号</CardTitle>
                    <CardDescription className="text-xs">点击账号快速登录</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {activeProviderAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between p-3 border border-border/50 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
                        onClick={() => {
                          switchAccount(account.id);
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{getAccountDisplayName(account)}</div>
                          {getAccountDescription(account) && (
                            <div className="text-xs text-muted-foreground truncate">
                              {getAccountDescription(account)}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            添加于 {new Date(account.addedAt).toLocaleString("zh-CN")}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAccount(account.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  {activeProviderAccounts.length > 0 ? "添加新账号" : `${provider.label} 凭据`}
                </CardTitle>
                <CardDescription>您的凭据将安全存储在本地浏览器中</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    verifyAndSaveCredentials();
                  }}
                  autoComplete="off"
                >
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="cfEmail">{credentialCopy.primaryLabel}</Label>
                      <Input
                        id="cfEmail"
                        name="cfEmail"
                        type={isCloudflareProvider ? "email" : "text"}
                        autoComplete="off"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        value={cfEmail}
                        onChange={(e) => setCfEmail(e.target.value)}
                        placeholder={credentialCopy.primaryPlaceholder}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cfApiKey">{credentialCopy.secretLabel}</Label>
                      <Input
                        id="cfApiKey"
                        name="cfApiKey"
                        type="password"
                        autoComplete="off"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        value={cfApiKey}
                        onChange={(e) => setCfApiKey(e.target.value)}
                        placeholder={credentialCopy.secretPlaceholder}
                        className="mt-1.5"
                      />
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {credentialCopy.helpText}
                      </p>
                    </div>
                    <Button
                      type="submit"
                      disabled={isVerifying || !providerHasImplementedCapabilities(activeProviderId)}
                      className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-glow"
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          验证中...
                        </>
                      ) : !providerHasImplementedCapabilities(activeProviderId) ? (
                        "暂未接入"
                      ) : (
                        "验证并进入管理后台"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* 注册 Cloudflare 账号提示 */}
            {isCloudflareProvider && <div className="mt-6 text-center">
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <span>还没有 Cloudflare 账号？</span>
                <Button
                  variant="link"
                  className="p-0 h-auto font-medium text-primary hover:text-primary/80"
                  onClick={() => window.open("https://dash.cloudflare.com/sign-up", "_blank")}
                >
                  立即注册
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                注册后，您可以免费使用 Cloudflare 的 CDN、DNS 和其他强大功能
              </p>
            </div>}
          </div>
        </section>

        <footer className="border-t border-border/40 py-6 mt-16">
          <div className="container mx-auto px-4">
            <p className="text-center text-sm text-muted-foreground">Power by Cloudflare 致敬赛博大善人</p>
          </div>
        </footer>
      </div>
    );
  }

  // 管理后台界面
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/10">
        <Sidebar className="border-r border-border/40">
          <div className="p-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-3 rounded-lg p-2 flex-1 min-w-0 cursor-pointer"
                onClick={() => {
                  // 如果设置为公开模式，点击 logo 不做任何操作
                  if (!workersHiddenByDefault) {
                    return;
                  }

                  // 隐藏模式：累计点击次数
                  const newCount = logoClicks + 1;
                  setLogoClicks(newCount);
                  if (newCount >= 11) {
                    setShowWorkers(true);
                    setWorkerPermanentlyVisible(true);
                    toast({
                      title: "Workers 功能已解锁",
                      description: "现在可以在侧边栏看到 Workers 管理功能了",
                    });
                  }
                }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                  <img src={spiderIcon} alt="蜘蛛网络" className="w-8 h-8 object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-sm">蜘蛛网络</h2>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity">
                        <p className="text-xs text-muted-foreground truncate">{currentAccountDisplayName}</p>
                        <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[280px] bg-background border-border z-50">
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        已保存的 {provider.label} 账号
                      </div>
                      {activeProviderAccounts.map((account) => (
                        <DropdownMenuItem
                          key={account.id}
                          className="flex items-center justify-between cursor-pointer focus:bg-accent"
                          onClick={() => {
                            if (account.id !== currentAccountId) {
                              switchAccount(account.id);
                            }
                          }}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {account.id === currentAccountId && (
                              <Check className="w-4 h-4 text-primary flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{getAccountDisplayName(account)}</div>
                              <div className="text-xs text-muted-foreground truncate">{providers[account.provider].label}</div>
                              {getAccountDescription(account) && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {getAccountDescription(account)}
                                </div>
                              )}
                            </div>
                          </div>
                          {activeProviderAccounts.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAccount(account.id);
                              }}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuItem
                        className="flex items-center gap-2 cursor-pointer focus:bg-accent text-primary"
                        onClick={addNewAccount}
                      >
                        <UserPlus className="w-4 h-4" />
                        <span className="font-medium">添加新账号</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>

          <SidebarContent>
            {/* 全局功能 */}
            <SidebarGroup>
              <SidebarGroupLabel>全局功能</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {renderCapabilitySidebarItem("zones", "global")}
                  {isCloudflareProvider && (
                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={() => setActiveView("deploy")} isActive={activeView === "deploy"}>
                        <Zap className="w-4 h-4" />
                        <span>一键加速</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  {isCloudflareProvider && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => {
                          if (!selectedZone && zones.length > 0) {
                            setSelectedZone(zones[0].id);
                            setSelectedZoneName(zones[0].name);
                          }
                          setActiveView("auto-optimization");
                        }}
                        isActive={activeView === "auto-optimization"}
                      >
                        <Settings className="w-4 h-4" />
                        <span>自动优化</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setActiveView("operation-history")}
                      isActive={activeView === "operation-history"}
                    >
                      <History className="w-4 h-4" />
                      <span>操作历史</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {renderCapabilitySidebarItem("workers", "global")}
                  {renderCapabilitySidebarItem("pages", "global")}
                  {renderCapabilitySidebarItem("d1", "global")}
                  {renderCapabilitySidebarItem("r2", "global")}
                  {renderCapabilitySidebarItem("kv", "global")}
                  {isCloudflareProvider && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveView("worker-templates")}
                        isActive={activeView === "worker-templates"}
                      >
                        <Code2 className="w-4 h-4" />
                        <span>Worker 模板库</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  {renderCapabilitySidebarItem("tunnels", "global")}
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setActiveView("feedback")} isActive={activeView === "feedback"}>
                      <MessageSquare className="w-4 h-4" />
                      <span>需求开发</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* 管理员控制 */}
            {isAdmin && isCloudflareProvider && (
              <SidebarGroup>
                <SidebarGroupLabel>管理员控制</SidebarGroupLabel>
                <SidebarGroupContent>
                  <div className="px-2 py-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="workers-hidden-toggle" className="text-sm cursor-pointer">
                        Workers 隐藏模式
                      </Label>
                      <Switch
                        id="workers-hidden-toggle"
                        checked={workersHiddenByDefault}
                        onCheckedChange={updateWorkersHiddenSetting}
                        disabled={isLoadingWorkersSetting}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {workersHiddenByDefault ? "其他用户需解锁才能看到" : "所有用户可直接访问"}
                    </p>
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* 域名特定功能 - 只在选择域名后显示 */}
            {selectedZone && selectedZoneName && (
              <SidebarGroup>
                <div className="px-2 pb-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between text-base font-bold text-foreground hover:bg-muted"
                      >
                        {selectedZoneName}
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[240px]">
                      {zones.map((zone) => (
                        <DropdownMenuItem
                          key={zone.id}
                          onClick={() => {
                            setSelectedZone(zone.id);
                            setSelectedZoneName(zone.name);
                            setDnsRecords([]);
                            setWorkerRoutes([]);
                            // 保持当前视图，除非在域名列表页
                            if (activeView === "zones") {
                              setActiveView("dns");
                            }
                            // 根据当前视图重新加载对应数据
                            if (activeView === "dns") {
                              loadDNSRecords(zone.id);
                            } else if (activeView === "ssl") {
                              loadZoneSettings(zone.id);
                            } else if (activeView === "cache") {
                              loadZoneSettings(zone.id);
                            } else if (activeView === "firewall") {
                              loadFirewallRules(zone.id);
                              loadRateLimitRules(zone.id);
                            } else if (activeView === "analytics") {
                              loadAnalytics(zone.id);
                            } else if (activeView === "certificates") {
                              loadCertificates();
                            } else if (activeView === "page-rules") {
                              loadPageRules();
                            }
                          }}
                          className="cursor-pointer"
                        >
                          {zone.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Separator className="mt-2" />
                </div>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {renderCapabilitySidebarItem("dns", "zone")}
                    {isCloudflareProvider && (
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => {
                            setActiveView("ssl");
                            if (selectedZone) {
                              loadZoneSettings(selectedZone);
                            }
                          }}
                          isActive={activeView === "ssl"}
                        >
                          <Shield className="w-4 h-4" />
                          <span>SSL/TLS</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                    {isCloudflareProvider && (
                      <SidebarMenuItem>
                        <SidebarMenuButton onClick={() => setActiveView("cache")} isActive={activeView === "cache"}>
                          <Database className="w-4 h-4" />
                          <span>缓存管理</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                    {isCloudflareProvider && (
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => {
                            setActiveView("firewall");
                            if (selectedZone) {
                              loadFirewallRules(selectedZone);
                              loadRateLimitRules(selectedZone);
                            }
                          }}
                          isActive={activeView === "firewall"}
                        >
                          <Shield className="w-4 h-4" />
                          <span>防火墙</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                    {renderCapabilitySidebarItem("analytics", "zone")}
                    {renderCapabilitySidebarItem("page-rules", "zone")}
                    {renderCapabilitySidebarItem("kv", "zone")}
                    {renderCapabilitySidebarItem("certificates", "zone")}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <header className="border-b border-border/40 backdrop-blur-sm bg-card/50 sticky top-0 z-50">
            <div className="px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <h1 className="text-lg font-bold">
                  {activeView === "deploy" && "一键加速"}
                  {activeView === "zones" && "域名管理"}
                  {activeView === "dns" && "DNS 记录管理"}
                  {activeView === "workers" && "Workers 管理"}
                  {activeView === "pages" && "Pages 管理"}
                  {activeView === "worker-detail" && "Worker 详情"}
                  {activeView === "ssl" && "SSL/TLS 管理"}
                  {activeView === "cache" && "缓存管理"}
                  {activeView === "firewall" && "防火墙规则"}
                  {activeView === "analytics" && "分析统计"}
                  {activeView === "page-rules" && "页面规则"}
                  {activeView === "kv-storage" && "KV 存储管理"}
                  {activeView === "certificates" && "证书管理"}
                  {activeView === "d1-database" && "D1 数据库管理"}
                  {activeView === "r2-storage" && "R2 存储桶管理"}
                  {activeView === "tunnels" && "Cloudflare Tunnels"}
                  {activeView === "feedback" && "需求开发"}
                  {activeView === "operation-history" && "操作历史"}
                  {activeView === "worker-templates" && "Worker 模板库"}
                  {activeView === "auto-optimization" && "自动优化设置"}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <ProviderSwitcher active={activeProviderId} onChange={handleProviderChange} />
                <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost">退出</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>退出账号</AlertDialogTitle>
                      <AlertDialogDescription>是否要退出当前账号，您也可以切换到其它账号</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      {activeProviderAccounts.length > 1 && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            // 切换到下一个账号
                            const currentIndex = activeProviderAccounts.findIndex((acc) => acc.id === currentAccountId);
                            const nextIndex = (currentIndex + 1) % activeProviderAccounts.length;
                            const nextAccount = activeProviderAccounts[nextIndex];
                            switchAccount(nextAccount.id);
                            setLogoutDialogOpen(false);
                          }}
                        >
                          切换
                        </Button>
                      )}
                      <AlertDialogAction
                        onClick={() => {
                          // 完全退出
                          clearCloudflareCredentials();
                          // 清除当前账号标记，避免自动恢复
                          try {
                            localStorage.removeItem("cf_current_account_id");
                          } catch {
                            // ignore storage cleanup failures
                          }
                          // 清除可能遗留的旧会话存储
                          try {
                            sessionStorage.removeItem("cf_email");
                            sessionStorage.removeItem("cf_api_key");
                          } catch {
                            // ignore storage cleanup failures
                          }
                          resetAllState();
                          setCfEmail("");
                          setCfApiKey("");
                          setHasCredentials(false);
                          setCurrentAccountId(null);
                          setLogoutDialogOpen(false);
                        }}
                      >
                        退出
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 overflow-auto">
            {activeView === "deploy" && (
              <div className="max-w-7xl mx-auto">
                <div className="mb-3">
                  <DeploymentForm cfEmail={cfEmail} cfApiKey={cfApiKey} />
                </div>

                {/* 底部使用说明 - 横向排列 */}
                <Card className="shadow-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5" />
                      使用前必看
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      {/* 第一项 */}
                      <div className="space-y-1.5">
                        <h4 className="font-semibold flex items-center gap-1.5 text-xs">
                          <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">
                            1
                          </span>
                          加速自己的网站
                        </h4>
                        <p className="text-muted-foreground leading-snug">
                          假如你的服务器ip是1.1.1.1，你希望用www.xx.com访问你的网站并加速，那么需要先删除www.xx.com的A纪录，然后用其它域名指向该服务器，比如给jiasu.xx.com添加A纪录1.1.1.1，然后再将jiasu.xx.com填写在"目标域名"，将www.xx.com填写在"访问域名"，这样你的www.xx.com就被加速了。
                        </p>
                      </div>

                      {/* 第二项 */}
                      <div className="space-y-1.5">
                        <h4 className="font-semibold flex items-center gap-1.5 text-xs">
                          <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">
                            2
                          </span>
                          加速别人的网站
                        </h4>
                        <p className="text-muted-foreground leading-snug">
                          比如www.cc.com这个网站大陆访问不了或者说访问很慢，你就把www.cc.com填写在"目标域名"处，然后在访问域名填写任意你自己的域名，比如cc.xx.com(无须在DNS处创建)，填写在访问域名，这样你就能够通过cc.xx.com访问被墙或者速度很慢的www.cc.com
                        </p>
                      </div>

                      {/* 第三项 */}
                      <div className="space-y-1.5">
                        <h4 className="font-semibold flex items-center gap-1.5 text-xs">
                          <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">
                            3
                          </span>
                          缓存使用说明
                        </h4>
                        <p className="text-muted-foreground leading-snug">
                          网站主要是"静态内容为主"，比如企业官网、博客建议开启缓存，网站加载更快、能节省服务器带宽、抵御流量攻击。缓存时间可根据你的需要填写。如果网站内容是实时变化的，论坛、电商、聊天系统、动态数据页面，缓存时间保持默认"0"，否则缓存后容易出现内容错乱、旧数据或隐私泄露。
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeView === "zones" && (
              <div className="max-w-4xl mx-auto">
                {isCloudflareProvider && <AddZoneForm onSuccess={loadZones} />}

                <Card className="shadow-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Globe className="w-4 h-4" />
                      域名列表
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    ) : zones.length === 0 ? (
                      <p className="text-center text-muted-foreground py-6 text-sm">
                        {getProviderEmptyZonesText(activeProviderId)}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {/* 表头 */}
                        <div className="px-2.5 py-2 border-b border-border/50">
                          <div className="flex items-center gap-4">
                            <div className="w-[120px] flex-shrink-0 text-xs font-semibold text-muted-foreground">
                              域名
                            </div>
                            <div className="text-xs font-semibold text-muted-foreground whitespace-nowrap ml-3">
                              状态
                            </div>
                            <div className="w-10 flex-shrink-0"></div>
                            <div className="text-xs font-semibold text-muted-foreground ml-[120px]">区域ID</div>
                            <div className="flex-1"></div>
                            {isCloudflareProvider && (
                              <>
                                <div className="text-xs font-semibold text-muted-foreground pr-[8px]">计划</div>
                                <div className="w-[52px] ml-10"></div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* 域名列表 */}
                        {zones
                          .sort((a, b) => {
                            // 已激活的域名排在前面
                            if (a.status === "active" && b.status !== "active") return -1;
                            if (a.status !== "active" && b.status === "active") return 1;
                            return 0;
                          })
                          .map((zone) => (
                            <div
                              key={zone.id}
                              className={`rounded-md border transition-all overflow-hidden ${
                                zone.status === "active"
                                  ? "border-border/50 hover:border-primary/50"
                                  : "border-red-500/50 hover:border-red-500"
                              }`}
                            >
                              <div
                                className="p-2.5 hover:bg-muted/50 group cursor-pointer"
                                onClick={() => {
                                  setSelectedZone(zone.id);
                                  setSelectedZoneName(zone.name);
                                  setActiveView("dns");
                                  loadDNSRecords(zone.id);
                                }}
                              >
                                <div className="flex items-center gap-4">
                                  {/* 域名 */}
                                  <h3 className="font-medium text-sm w-[120px] flex-shrink-0 hover:text-primary transition-colors">
                                    {zone.name}
                                  </h3>

                                  {/* 状态标签 */}
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                                      zone.status === "active"
                                        ? "bg-green-500/10 text-green-500"
                                        : "bg-yellow-500/10 text-yellow-500"
                                    }`}
                                  >
                                    {zone.status === "active" ? "已激活" : "待激活"}
                                  </span>

                                  {/* 间距 */}
                                  <div className="w-10 flex-shrink-0"></div>

                                  {/* 区域ID */}
                                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                                    <span>
                                      区域ID: <code className="text-xs font-mono">{zone.id}</code>
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 hover:bg-primary/10"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(zone.id);
                                        toast({
                                          title: "已复制区域ID",
                                          description: zone.id,
                                        });
                                      }}
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="12"
                                        height="12"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                                      </svg>
                                    </Button>
                                  </div>

                                  {/* 占位 */}
                                  <div className="flex-1"></div>

                                  {isCloudflareProvider && (
                                    <>
                                      {/* 付费状态 */}
                                      <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded text-xs whitespace-nowrap mr-[20px]">
                                        Free
                                      </span>

                                      {/* 操作按钮 */}
                                      <div className="flex items-center gap-2 ml-10">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm(`确定要删除域名 ${zone.name} 吗？此操作无法撤销。`)) {
                                              deleteZone(zone.id, zone.name);
                                            }
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                              {isCloudflareProvider && zone.status === "pending" && zone.name_servers && (
                                <div className="px-2.5 pb-2.5 pt-2 bg-muted/30 border-t border-border/30">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                      请在您的域名注册商处将该域名的NS纪录改为Cloudflare的NS纪录：
                                    </span>
                                    {zone.name_servers.map((ns: string, idx: number) => (
                                      <div
                                        key={ns}
                                        className="flex items-center gap-1 bg-background/80 px-2 py-1 rounded border border-border/50"
                                      >
                                        <code className="text-xs">{ns}</code>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-4 w-4 hover:bg-primary/10"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(ns);
                                            toast({
                                              title: "已复制",
                                              description: ns,
                                            });
                                          }}
                                        >
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="12"
                                            height="12"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          >
                                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                                          </svg>
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeView === "dns" && selectedZone && (
              <div className="max-w-4xl mx-auto">
                <Card className="shadow-card mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <span>{selectedZoneName}</span>
                      <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-md">
                        <span className="text-sm text-muted-foreground font-normal">区域ID:</span>
                        <code className="text-sm font-mono">{selectedZone}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-primary/10"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedZone);
                            toast({
                              title: "已复制区域ID",
                              description: selectedZone,
                            });
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                          </svg>
                        </Button>
                      </div>
                    </CardTitle>
                    <CardDescription>管理此域名的 DNS 记录</CardDescription>
                  </CardHeader>
                </Card>

                {isCloudflareProvider && (
                  <AddDNSRecordForm
                    key={`${selectedZone}-${dnsNavClicks}`}
                    zoneId={selectedZone}
                    onSuccess={() => loadDNSRecords(selectedZone)}
                    cfEmail={cfEmail}
                    cfApiKey={cfApiKey}
                  />
                )}

                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle>DNS 记录</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : dnsRecords.length === 0 && workerRoutes.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">暂无 DNS 记录</p>
                    ) : (
                      <div className="space-y-2">
                        {/* 表头 */}
                        <div className="flex items-center gap-4 px-3 py-2 border-b border-border/50">
                          <span className="text-xs font-semibold text-muted-foreground min-w-[60px] text-center">
                            类型
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground min-w-[200px]">域名</span>
                          <span className="text-xs font-semibold text-muted-foreground flex-1">内容</span>
                          <span className="text-xs font-semibold text-muted-foreground flex-shrink-0 w-[28px] text-left transform -translate-x-2">
                            代理状态
                          </span>
                          {isCloudflareProvider && (
                            <div className="flex gap-2 flex-shrink-0" style={{ width: "104px" }}>
                              {/* 占位符，与按钮宽度对齐 */}
                            </div>
                          )}
                        </div>

                        {/* 显示DNS记录 */}
                        {dnsRecords.map((record) => {
                          const accountId = zones.find((z) => z.id === selectedZone)?.account?.id || "";
                          const matchedRoute = workerRoutes.find((route) => {
                            // 常见模式: "host/*"、"*.domain/*"，这里用包含与前缀判断做近似匹配
                            if (!route?.pattern) return false;
                            const patternHost = route.pattern.split("/")[0];
                            return (
                              patternHost === record.name ||
                              route.pattern.startsWith(`${record.name}/`) ||
                              route.pattern.includes(record.name)
                            );
                          });
                          const isWorkerAlias = record.type === "AAAA" && record.content === "100::" && !!matchedRoute;

                          // 隐藏Worker记录，直到showWorkers为true
                          if (isWorkerAlias && !showWorkers) {
                            return null;
                          }

                          return (
                            <div
                              key={record.id}
                              className="flex items-center gap-4 p-3 rounded-lg border border-border/50 hover:border-primary/50 transition-colors"
                            >
                              <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-mono rounded min-w-[60px] text-center">
                                {isWorkerAlias ? "Worker" : record.type}
                              </span>
                              <span className="font-medium min-w-[200px] truncate">{record.name}</span>
                              {isWorkerAlias ? (
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <a
                                    href={`https://dash.cloudflare.com/${accountId}/workers/services/view/${matchedRoute!.script}/production/triggers`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary hover:underline truncate"
                                    title={matchedRoute!.script}
                                  >
                                    {matchedRoute!.script}
                                  </a>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 hover:bg-primary/10 flex-shrink-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(matchedRoute!.script);
                                      toast({
                                        title: "已复制",
                                        description: matchedRoute!.script,
                                      });
                                    }}
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                                    </svg>
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <span className="text-sm text-muted-foreground truncate" title={record.content}>
                                    {record.content}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 hover:bg-primary/10 flex-shrink-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(record.content);
                                      toast({
                                        title: "已复制",
                                        description: record.content,
                                      });
                                    }}
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                                    </svg>
                                  </Button>
                                </div>
                              )}
                              <span
                                className="text-lg flex-shrink-0 w-[28px] text-left transform -translate-x-5"
                                title={record.proxied ? "代理已开启" : "代理未开启"}
                              >
                                {record.proxied ? "🟡" : "⚪"}
                              </span>
                              {isCloudflareProvider && (
                                <div className="flex gap-2 flex-shrink-0">
                                  <Button size="sm" variant="outline" onClick={() => setEditingRecord(record)}>
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => deleteDNSRecord(selectedZone, record.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {/* 显示Worker路由 */}
                        {showWorkers &&
                          workerRoutes.map((route) => {
                            const accountId = zones.find((z) => z.id === selectedZone)?.account?.id || "";
                            return (
                              <div
                                key={route.id}
                                className="flex items-center gap-4 p-3 rounded-lg border border-border/50 hover:border-primary/50 transition-colors"
                              >
                                <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-mono rounded min-w-[60px] text-center">
                                  Worker
                                </span>
                                <span className="font-medium min-w-[200px] truncate">{route.pattern}</span>
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <a
                                    href={`https://dash.cloudflare.com/${accountId}/workers/services/view/${route.script}/production/triggers`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary hover:underline truncate"
                                    title={route.script}
                                  >
                                    {route.script}
                                  </a>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 hover:bg-primary/10 flex-shrink-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(route.script);
                                      toast({
                                        title: "已复制",
                                        description: route.script,
                                      });
                                    }}
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                                    </svg>
                                  </Button>
                                </div>
                                <span
                                  className="text-lg flex-shrink-0 w-[28px] text-left transform -translate-x-5"
                                  title="代理已开启"
                                >
                                  🟡
                                </span>
                                <div className="flex gap-2 flex-shrink-0">
                                  <Button size="sm" variant="outline" disabled>
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={async () => {
                                      if (!confirm("确定要删除这个 Worker 路由吗？")) return;
                                      const email = getCookie("cf_email");
                                      const apiKey = getCookie("cf_api_key");
                                      if (!email || !apiKey) return;

                                      try {
                                        const { data, error } = await supabase.functions.invoke("cloudflare-api", {
                                          body: {
                                            action: "delete_worker_route",
                                            email,
                                            apiKey,
                                            zoneId: selectedZone,
                                            routeId: route.id,
                                          },
                                        });

                                        if (error) throw error;

                                        if (data.success) {
                                          toast({
                                            title: "删除成功",
                                          });
                                          loadDNSRecords(selectedZone);
                                        }
                                      } catch (error) {
                                        console.error("Delete worker route error:", error);
                                        toast({
                                          title: "删除失败",
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {isCloudflareProvider && editingRecord && (
                  <EditDNSRecordForm
                    record={editingRecord}
                    zoneId={selectedZone}
                    open={!!editingRecord}
                    onOpenChange={(open) => !open && setEditingRecord(null)}
                    onSuccess={() => loadDNSRecords(selectedZone)}
                    cfEmail={cfEmail}
                    cfApiKey={cfApiKey}
                  />
                )}
              </div>
            )}

	            {activeView === "workers" && (
	              <WorkersView
	                scripts={workers.map(toWorkersViewItem)}
	                isLoading={isLoading}
	                onRefresh={loadWorkers}
	                onCreate={isCloudflareProvider ? () => setCreateWorkerOpen(true) : undefined}
	                onEdit={
	                  isCloudflareProvider
	                    ? (workerId) => {
	                        setEditingWorker({ id: workerId, name: workerId });
	                        setEditWorkerOpen(true);
	                        if (zones.length > 0 && zones[0]?.account?.id) {
	                          loadWorkerBindings(workerId, zones[0].account.id);
	                        }
	                      }
	                    : undefined
	                }
	                onDelete={isCloudflareProvider ? (workerId) => deleteWorker(workerId, workerId) : undefined}
	                workerSubdomain={workerSubdomain}
	                bindingsByWorkerId={allWorkerBindings}
	                analyticsPanel={
	                  isCloudflareProvider && zones.length > 0 && zones[0]?.account?.id ? (
	                    <WorkerAnalyticsPanel accountId={zones[0].account.id} email={cfEmail} apiKey={cfApiKey} />
	                  ) : null
	                }
	                onCopyUrl={(url, type) => {
	                  navigator.clipboard.writeText(url);
	                  toast({
	                    description: type === "workersDev" ? "链接已复制到剪贴板" : "自定义域名已复制",
	                  });
	                }}
	                onBindD1={
	                  isCloudflareProvider
	                    ? (workerId) => {
	                        setWorkerForD1Binding({ id: workerId, name: workerId });
	                        setBindD1Open(true);
	                      }
	                    : undefined
	                }
	                onBindR2={
	                  isCloudflareProvider
	                    ? (workerId) => {
	                        setWorkerForR2Binding({ id: workerId, name: workerId });
	                        setBindR2Open(true);
	                      }
	                    : undefined
	                }
	                onBindKV={
	                  isCloudflareProvider
	                    ? (workerId) => {
	                        setWorkerForKVBinding({ id: workerId, name: workerId });
	                        setBindKVOpen(true);
	                      }
	                    : undefined
	                }
	                onManageVariables={
	                  isCloudflareProvider
	                    ? (workerId) => {
	                        setWorkerForVariables({ id: workerId, name: workerId });
	                        setManageVariablesOpen(true);
	                      }
	                    : undefined
	                }
	              />
	            )}

            {activeView === "worker-detail" && selectedWorker && (
              <div className="max-w-6xl mx-auto">
                <div className="mb-4">
                  <Button variant="ghost" onClick={() => setActiveView("workers")}>
                    ← 返回 Workers 列表
                  </Button>
                </div>

                <div className="grid gap-6">
                  <Card className="shadow-card">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Worker 详情</CardTitle>
                          <CardDescription>{selectedWorker}</CardDescription>
                        </div>
                        <Button
                          onClick={() => {
                            setWorkerForD1Binding({ id: selectedWorker, name: selectedWorker });
                            setBindD1Open(true);
                          }}
                        >
                          <Database className="w-4 h-4 mr-2" />
                          绑定 D1 数据库
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {workerDetail ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-muted-foreground">Worker ID</Label>
                              <p className="font-mono text-sm mt-1">{workerDetail.id}</p>
                            </div>
                            {workerDetail.script_name && (
                              <div>
                                <Label className="text-muted-foreground">脚本名称</Label>
                                <p className="font-mono text-sm mt-1">{workerDetail.script_name}</p>
                              </div>
                            )}
                            <div>
                              <Label className="text-muted-foreground">创建时间</Label>
                              <p className="text-sm mt-1">
                                {new Date(workerDetail.created_on).toLocaleString("zh-CN")}
                              </p>
                            </div>
                            {workerDetail.modified_on && (
                              <div>
                                <Label className="text-muted-foreground">修改时间</Label>
                                <p className="text-sm mt-1">
                                  {new Date(workerDetail.modified_on).toLocaleString("zh-CN")}
                                </p>
                              </div>
                            )}
                            {workerDetail.usage_model && (
                              <div>
                                <Label className="text-muted-foreground">使用模式</Label>
                                <p className="text-sm mt-1">{workerDetail.usage_model}</p>
                              </div>
                            )}
                            {workerDetail.compatibility_date && (
                              <div>
                                <Label className="text-muted-foreground">兼容日期</Label>
                                <p className="text-sm mt-1">{workerDetail.compatibility_date}</p>
                              </div>
                            )}
                            {workerDetail.etag && (
                              <div className="col-span-2">
                                <Label className="text-muted-foreground">ETag</Label>
                                <p className="font-mono text-xs mt-1 break-all">{workerDetail.etag}</p>
                              </div>
                            )}
                            {workerDetail.handlers && workerDetail.handlers.length > 0 && (
                              <div className="col-span-2">
                                <Label className="text-muted-foreground">处理器</Label>
                                <div className="flex gap-2 mt-1">
                                  {workerDetail.handlers.map((handler, idx) => (
                                    <span
                                      key={handler}
                                      className="px-2 py-1 bg-primary/10 text-primary text-xs rounded"
                                    >
                                      {handler}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 显示 D1 数据库绑定 */}
                          {workerBindings.length > 0 && (
                            <div className="mt-6 pt-4 border-t">
                              <Label className="text-muted-foreground mb-3 block">D1 数据库绑定</Label>
                              <div className="space-y-2">
                                {workerBindings
                                  .filter((b) => b.type === "d1")
                                  .map((binding, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between p-3 bg-muted/30 rounded-md"
                                    >
                                      <div>
                                        <p className="font-mono text-sm font-semibold">{binding.name}</p>
                                        <p className="font-mono text-xs text-muted-foreground mt-1">
                                          Database ID: {binding.id}
                                        </p>
                                      </div>
                                      <span className="px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs rounded">
                                        已绑定
                                      </span>
                                    </div>
                                  ))}
                                {workerBindings.filter((b) => b.type === "d1").length === 0 && (
                                  <p className="text-sm text-muted-foreground py-2">此 Worker 暂无 D1 数据库绑定</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-8">无法加载 Worker 详情</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Worker 分析面板 */}
                  {zones[0]?.account?.id && (
                    <WorkerAnalyticsPanel
                      accountId={zones[0].account.id}
                      email={cfEmail}
                      apiKey={cfApiKey}
                      scriptName={selectedWorker}
                    />
                  )}
                </div>
              </div>
            )}

            {activeView === "ssl" && selectedZone && (
              <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setActiveView("zones");
                      setSelectedZone("");
                      setSelectedZoneName("");
                    }}
                  >
                    ← 返回域名列表
                  </Button>
                </div>

                <Card className="shadow-card mb-6">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="w-5 h-5" />
                          SSL/TLS 管理
                        </CardTitle>
                        <CardDescription>当前域名: {selectedZoneName}</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadZoneSettings(selectedZone)}
                        disabled={isLoading}
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "刷新"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="p-4 border border-border/50 rounded-lg">
                        <h3 className="font-medium mb-2">SSL/TLS 加密模式</h3>
                        <p className="text-sm text-muted-foreground mb-4">选择 Cloudflare 与源服务器之间的加密方式</p>
                        <div className="grid gap-3">
                          <div
                            onClick={() => updateZoneSetting("ssl", "off")}
                            className={`flex items-start gap-3 p-3 rounded-md border ${sslMode === "off" ? "border-primary bg-primary/5" : "border-border/30 hover:border-primary/50"} transition-colors cursor-pointer`}
                          >
                            <div className="flex-1">
                              <div className="font-medium text-sm">关闭 (不安全)</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                不加密您的网站与 Cloudflare 之间的流量
                              </div>
                            </div>
                          </div>
                          <div
                            onClick={() => updateZoneSetting("ssl", "flexible")}
                            className={`flex items-start gap-3 p-3 rounded-md border ${sslMode === "flexible" ? "border-primary bg-primary/5" : "border-border/30 hover:border-primary/50"} transition-colors cursor-pointer`}
                          >
                            <div className="flex-1">
                              <div className="font-medium text-sm">灵活</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                加密浏览器到 Cloudflare 的流量，但不加密 Cloudflare 到源服务器的流量
                              </div>
                            </div>
                          </div>
                          <div
                            onClick={() => updateZoneSetting("ssl", "full")}
                            className={`flex items-start gap-3 p-3 rounded-md border ${sslMode === "full" ? "border-primary bg-primary/5" : "border-border/30 hover:border-primary/50"} transition-colors cursor-pointer`}
                          >
                            <div className="flex-1">
                              <div className="font-medium text-sm">完全</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                加密端到端流量，但不验证源服务器证书
                              </div>
                            </div>
                          </div>
                          <div
                            onClick={() => updateZoneSetting("ssl", "strict")}
                            className={`flex items-start gap-3 p-3 rounded-md border ${sslMode === "strict" ? "border-primary bg-primary/5" : "border-border/30 hover:border-primary/50"} transition-colors cursor-pointer`}
                          >
                            <div className="flex-1">
                              <div className="font-medium text-sm">完全（严格）</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                加密端到端流量，并验证源服务器证书
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 border border-border/50 rounded-lg">
                        <h3 className="font-medium mb-2">边缘证书</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Cloudflare 自动为您的域名提供免费的通用 SSL 证书
                        </p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">证书状态</span>
                            <span className="text-green-500">已激活</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">证书类型</span>
                            <span>通用 SSL</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 border border-border/50 rounded-lg">
                        <h3 className="font-medium mb-2">始终使用 HTTPS</h3>
                        <p className="text-sm text-muted-foreground mb-3">自动将所有 HTTP 请求重定向到 HTTPS</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">启用 HTTPS 重定向</span>
                          <Switch
                            checked={alwaysUseHttps}
                            onCheckedChange={(checked) => updateZoneSetting("always_use_https", checked ? "on" : "off")}
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      <div className="p-4 border border-border/50 rounded-lg">
                        <h3 className="font-medium mb-2">自动 HTTPS 重写</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          自动将不安全的 HTTP 链接重写为安全的 HTTPS 链接
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">启用自动 HTTPS 重写</span>
                          <Switch
                            checked={automaticHttpsRewrites}
                            onCheckedChange={(checked) =>
                              updateZoneSetting("automatic_https_rewrites", checked ? "on" : "off")
                            }
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      <div className="p-4 border border-border/50 rounded-lg">
                        <h3 className="font-medium mb-2">HTTP 严格传输安全 (HSTS)</h3>
                        <p className="text-sm text-muted-foreground mb-3">强制浏览器始终使用 HTTPS 连接，提高安全性</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">启用 HSTS</span>
                          <Switch
                            checked={hstsEnabled}
                            onCheckedChange={(checked) => updateHstsSetting(checked)}
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      <div className="p-4 border border-border/50 rounded-lg">
                        <h3 className="font-medium mb-2">随机加密</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          允许支持的浏览器在 HTTP 请求上随机使用 HTTPS
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">启用随机加密</span>
                          <Switch
                            checked={opportunisticEncryption}
                            onCheckedChange={(checked) =>
                              updateZoneSetting("opportunistic_encryption", checked ? "on" : "off")
                            }
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      <div className="p-4 border border-border/50 rounded-lg">
                        <h3 className="font-medium mb-2">TLS 1.3</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          启用最新的 TLS 1.3 协议，提供更好的性能和安全性
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">启用 TLS 1.3</span>
                          <Switch
                            checked={tls13}
                            onCheckedChange={(checked) => updateZoneSetting("tls_1_3", checked ? "on" : "off")}
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeView === "cache" && selectedZone && (
              <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setActiveView("zones");
                      setSelectedZone("");
                      setSelectedZoneName("");
                    }}
                  >
                    ← 返回域名列表
                  </Button>
                </div>

                <Card className="shadow-card mb-6">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Database className="w-5 h-5" />
                          缓存管理
                        </CardTitle>
                        <CardDescription>当前域名: {selectedZoneName}</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadZoneSettings(selectedZone)}
                        disabled={isLoading}
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "刷新"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="p-4 border border-border/50 rounded-lg">
                        <h3 className="font-medium mb-2">缓存级别</h3>
                        <p className="text-sm text-muted-foreground mb-4">设置 Cloudflare 如何缓存您网站的内容</p>
                        <div className="grid gap-3">
                          <div
                            onClick={() => updateZoneSetting("cache_level", "basic")}
                            className={`flex items-start gap-3 p-3 rounded-md border ${cacheLevel === "basic" ? "border-primary bg-primary/5" : "border-border/30 hover:border-primary/50"} transition-colors cursor-pointer`}
                          >
                            <div className="flex-1">
                              <div className="font-medium text-sm">无查询字符串</div>
                              <div className="text-xs text-muted-foreground mt-1">仅缓存没有查询字符串的资源</div>
                            </div>
                          </div>
                          <div
                            onClick={() => updateZoneSetting("cache_level", "simplified")}
                            className={`flex items-start gap-3 p-3 rounded-md border ${cacheLevel === "simplified" ? "border-primary bg-primary/5" : "border-border/30 hover:border-primary/50"} transition-colors cursor-pointer`}
                          >
                            <div className="flex-1">
                              <div className="font-medium text-sm">忽略查询字符串</div>
                              <div className="text-xs text-muted-foreground mt-1">缓存所有静态内容，忽略查询字符串</div>
                            </div>
                          </div>
                          <div
                            onClick={() => updateZoneSetting("cache_level", "aggressive")}
                            className={`flex items-start gap-3 p-3 rounded-md border ${cacheLevel === "aggressive" ? "border-primary bg-primary/5" : "border-border/30 hover:border-primary/50"} transition-colors cursor-pointer`}
                          >
                            <div className="flex-1">
                              <div className="font-medium text-sm">标准</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                根据查询字符串缓存所有静态内容（推荐）
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 border border-border/50 rounded-lg">
                        <h3 className="font-medium mb-2">浏览器缓存过期时间</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          设置浏览器应缓存资源的时长（当前:{" "}
                          {browserCacheTtl === 0
                            ? "遵循现有标头"
                            : browserCacheTtl < 60
                              ? `${browserCacheTtl} 秒`
                              : browserCacheTtl < 3600
                                ? `${browserCacheTtl / 60} 分钟`
                                : browserCacheTtl < 86400
                                  ? `${browserCacheTtl / 3600} 小时`
                                  : browserCacheTtl < 2592000
                                    ? `${browserCacheTtl / 86400} 天`
                                    : browserCacheTtl < 31536000
                                      ? `${browserCacheTtl / 2592000} 个月`
                                      : `${browserCacheTtl / 31536000} 年`}
                          ）
                        </p>
                        <div className="space-y-2">
                          <select
                            className="w-full p-2 border border-border/50 rounded-md bg-background"
                            value={browserCacheTtl}
                            onChange={(e) => updateZoneSetting("browser_cache_ttl", parseInt(e.target.value))}
                            disabled={isLoading}
                          >
                            <option value={0}>遵循现有标头</option>
                            <option value={60}>1 分钟</option>
                            <option value={300}>5 分钟</option>
                            <option value={1800}>30 分钟</option>
                            <option value={3600}>1 小时</option>
                            <option value={7200}>2 小时</option>
                            <option value={10800}>3 小时</option>
                            <option value={14400}>4 小时</option>
                            <option value={28800}>8 小时</option>
                            <option value={57600}>16 小时</option>
                            <option value={86400}>1 天</option>
                            <option value={259200}>3 天</option>
                            <option value={432000}>5 天</option>
                            <option value={691200}>8 天</option>
                            <option value={1382400}>16 天</option>
                            <option value={2592000}>1 个月</option>
                            <option value={5184000}>2 个月</option>
                            <option value={15552000}>6 个月</option>
                            <option value={31536000}>1 年</option>
                          </select>
                        </div>
                      </div>

                      <div className="p-4 border border-border/50 rounded-lg">
                        <h3 className="font-medium mb-2">清除缓存</h3>
                        <p className="text-sm text-muted-foreground mb-4">从 Cloudflare 的边缘服务器清除缓存的内容</p>
                        <div className="space-y-3">
                          <Button variant="outline" className="w-full" onClick={purgeAllCache} disabled={isLoading}>
                            清除所有缓存
                          </Button>
                          <div className="pt-2 border-t border-border/30">
                            <Label className="text-sm font-medium mb-2 block">自定义清除</Label>
                            <select
                              className="w-full p-2 border border-border/50 rounded-md bg-background mb-2"
                              value={purgeType}
                              onChange={(e) => setPurgeType(e.target.value as "url" | "host" | "tag" | "prefix")}
                              disabled={isLoading}
                            >
                              <option value="url">按 URL 清除</option>
                              <option value="host">按主机清除</option>
                              <option value="tag">按标签清除</option>
                              <option value="prefix">按前缀清除</option>
                            </select>
                            <Input
                              placeholder={
                                purgeType === "url"
                                  ? "例如: https://example.com/path"
                                  : purgeType === "host"
                                    ? "例如: www.example.com"
                                    : purgeType === "tag"
                                      ? "例如: cache-tag-name"
                                      : "例如: www.example.com/images"
                              }
                              className="mb-2"
                              value={purgeUrl}
                              onChange={(e) => setPurgeUrl(e.target.value)}
                              disabled={isLoading}
                            />
                            <Button variant="outline" size="sm" onClick={purgeUrlCache} disabled={isLoading}>
                              清除
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 border border-border/50 rounded-lg">
                        <h3 className="font-medium mb-2">开发模式</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          暂时绕过缓存，立即查看更改（3小时后自动关闭）
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">启用开发模式</span>
                          <Switch
                            checked={developmentMode}
                            onCheckedChange={updateDevelopmentMode}
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      <div className="p-4 border border-border/50 rounded-lg">
                        <h3 className="font-medium mb-2">宕机在线</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          服务器宕机时，Cloudflare 提供网站的缓存版本
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">启用宕机在线</span>
                          <Switch checked={alwaysOnline} onCheckedChange={updateAlwaysOnline} disabled={isLoading} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeView === "firewall" && selectedZone && (
              <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setActiveView("zones");
                      setSelectedZone("");
                      setSelectedZoneName("");
                    }}
                  >
                    ← 返回域名列表
                  </Button>
                </div>

                <Card className="shadow-card mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      防火墙规则管理
                    </CardTitle>
                    <CardDescription>当前域名: {selectedZoneName}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* 创建/编辑规则 */}
                      <div className="p-4 border border-border/50 rounded-lg bg-muted/30">
                        <h3 className="font-medium mb-4">
                          {editingFirewallRule ? "编辑防火墙规则" : "创建防火墙规则"}
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <Label className="text-sm mb-2 block">规则类型</Label>
                            <select
                              className="w-full p-2 border border-border/50 rounded-md bg-background"
                              value={newFirewallRule.type}
                              onChange={(e) => {
                                setNewFirewallRule({
                                  ...newFirewallRule,
                                  type: e.target.value,
                                  value: "",
                                  customExpression: "",
                                  description: "",
                                });
                              }}
                            >
                              <option value="ip">IP 地址</option>
                              <option value="country">国家/地区</option>
                              <option value="asn">ASN</option>
                              <option value="custom">自定义表达式</option>
                            </select>
                          </div>
                          <div>
                            <Label className="text-sm mb-2 block">动作</Label>
                            <select
                              className="w-full p-2 border border-border/50 rounded-md bg-background"
                              value={newFirewallRule.action}
                              onChange={(e) => setNewFirewallRule({ ...newFirewallRule, action: e.target.value })}
                            >
                              <option value="block">阻止</option>
                              <option value="allow">允许</option>
                              <option value="challenge">质询</option>
                              <option value="js_challenge">JS 质询</option>
                              <option value="log">仅记录</option>
                            </select>
                          </div>

                          {newFirewallRule.type === "custom" ? (
                            <>
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <Label className="text-sm">自定义表达式</Label>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowExpressionExamples(!showExpressionExamples)}
                                    className="text-xs h-7"
                                  >
                                    {showExpressionExamples ? "隐藏示例" : "查看示例"}
                                  </Button>
                                </div>
                                <Textarea
                                  placeholder='例如: (http.user_agent contains "sqlmap") or (http.user_agent contains "nmap")'
                                  value={newFirewallRule.customExpression || ""}
                                  onChange={(e) =>
                                    setNewFirewallRule({ ...newFirewallRule, customExpression: e.target.value })
                                  }
                                  className="font-mono text-sm min-h-[100px]"
                                />
                              </div>
                              <div>
                                <Label className="text-sm mb-2 block">规则描述（可选）</Label>
                                <Input
                                  placeholder="例如: 阻止恶意扫描器"
                                  value={newFirewallRule.description || ""}
                                  onChange={(e) =>
                                    setNewFirewallRule({ ...newFirewallRule, description: e.target.value })
                                  }
                                />
                              </div>

                              {showExpressionExamples && (
                                <div className="p-3 bg-background border border-border/50 rounded-md space-y-3 max-h-[500px] overflow-y-auto">
                                  <h4 className="font-medium text-sm mb-2">表达式示例</h4>

                                  <div className="space-y-2">
                                    <div className="text-xs font-semibold text-muted-foreground">🛡️ 安全防护</div>

                                    <button
                                      onClick={() =>
                                        setNewFirewallRule({
                                          ...newFirewallRule,
                                          customExpression:
                                            '(http.user_agent contains "sqlmap") or (http.user_agent contains "nmap") or (http.user_agent contains "python-requests")',
                                          description: "阻止常见恶意扫描器",
                                          action: "block",
                                        })
                                      }
                                      className="w-full text-left p-2 bg-muted/50 hover:bg-muted rounded text-xs space-y-1"
                                    >
                                      <div className="font-medium">阻止恶意扫描器</div>
                                      <code className="text-[10px] block text-muted-foreground break-all">
                                        (http.user_agent contains "sqlmap") or (http.user_agent contains "nmap") or
                                        (http.user_agent contains "python-requests")
                                      </code>
                                    </button>

                                    <button
                                      onClick={() =>
                                        setNewFirewallRule({
                                          ...newFirewallRule,
                                          customExpression: 'not http.user_agent lowercase matches "*mozilla*"',
                                          description: "拦截未带浏览器 UA 的攻击流量",
                                          action: "js_challenge",
                                        })
                                      }
                                      className="w-full text-left p-2 bg-muted/50 hover:bg-muted rounded text-xs space-y-1"
                                    >
                                      <div className="font-medium">拦截非浏览器 UA（防脚本扫描）</div>
                                      <code className="text-[10px] block text-muted-foreground break-all">
                                        not http.user_agent lowercase matches "*mozilla*"
                                      </code>
                                      <div className="text-[10px] text-muted-foreground">动作：JS Challenge</div>
                                    </button>

                                    <button
                                      onClick={() =>
                                        setNewFirewallRule({
                                          ...newFirewallRule,
                                          customExpression:
                                            '(http.request.uri contains "union select") or (http.request.uri contains "sleep(") or (http.request.uri contains " or 1=1")',
                                          description: "拦截明显的 SQL 注入特征",
                                          action: "block",
                                        })
                                      }
                                      className="w-full text-left p-2 bg-muted/50 hover:bg-muted rounded text-xs space-y-1"
                                    >
                                      <div className="font-medium">拦截 SQL 注入攻击</div>
                                      <code className="text-[10px] block text-muted-foreground break-all">
                                        (http.request.uri contains "union select") or (http.request.uri contains
                                        "sleep(") or (http.request.uri contains " or 1=1")
                                      </code>
                                    </button>

                                    <button
                                      onClick={() =>
                                        setNewFirewallRule({
                                          ...newFirewallRule,
                                          customExpression:
                                            '(http.request.uri.path contains "/wp-admin") or (http.request.uri.path contains "/admin") or (http.request.uri.path contains "/phpmyadmin")',
                                          description: "保护管理后台",
                                          action: "block",
                                        })
                                      }
                                      className="w-full text-left p-2 bg-muted/50 hover:bg-muted rounded text-xs space-y-1"
                                    >
                                      <div className="font-medium">保护管理后台路径</div>
                                      <code className="text-[10px] block text-muted-foreground break-all">
                                        (http.request.uri.path contains "/wp-admin") or (http.request.uri.path contains
                                        "/admin") or (http.request.uri.path contains "/phpmyadmin")
                                      </code>
                                    </button>

                                    <button
                                      onClick={() =>
                                        setNewFirewallRule({
                                          ...newFirewallRule,
                                          customExpression:
                                            'http.request.uri.path contains "/admin" and not ip.src in {1.2.3.4}',
                                          description: "限制后台访问（仅允许固定 IP）",
                                          action: "block",
                                        })
                                      }
                                      className="w-full text-left p-2 bg-muted/50 hover:bg-muted rounded text-xs space-y-1"
                                    >
                                      <div className="font-medium">限制后台访问（固定 IP 白名单）</div>
                                      <code className="text-[10px] block text-muted-foreground break-all">
                                        http.request.uri.path contains "/admin" and not ip.src in {"{1.2.3.4}"}
                                      </code>
                                      <div className="text-[10px] text-orange-500">⚠️ 请修改为您的实际 IP 地址</div>
                                    </button>

                                    <button
                                      onClick={() =>
                                        setNewFirewallRule({
                                          ...newFirewallRule,
                                          customExpression:
                                            '(http.request.uri.query contains "union select") or (http.request.uri.query contains "../../") or (http.request.uri.query contains "<script>")',
                                          description: "阻止 SQL 注入和 XSS 攻击",
                                          action: "block",
                                        })
                                      }
                                      className="w-full text-left p-2 bg-muted/50 hover:bg-muted rounded text-xs space-y-1"
                                    >
                                      <div className="font-medium">阻止 SQL 注入和 XSS（查询参数）</div>
                                      <code className="text-[10px] block text-muted-foreground break-all">
                                        (http.request.uri.query contains "union select") or (http.request.uri.query
                                        contains "../../") or (http.request.uri.query contains "&lt;script&gt;")
                                      </code>
                                    </button>
                                  </div>

                                  <div className="space-y-2 pt-2">
                                    <div className="text-xs font-semibold text-muted-foreground">🌍 地理位置</div>

                                    <button
                                      onClick={() =>
                                        setNewFirewallRule({
                                          ...newFirewallRule,
                                          customExpression: '(ip.geoip.country in {"CN" "US" "JP"})',
                                          description: "仅允许特定国家访问",
                                          action: "allow",
                                        })
                                      }
                                      className="w-full text-left p-2 bg-muted/50 hover:bg-muted rounded text-xs space-y-1"
                                    >
                                      <div className="font-medium">仅允许特定国家</div>
                                      <code className="text-[10px] block text-muted-foreground break-all">
                                        (ip.geoip.country in {"{"}\"CN\" \"US\" \"JP\"{"}"})
                                      </code>
                                    </button>

                                    <button
                                      onClick={() =>
                                        setNewFirewallRule({
                                          ...newFirewallRule,
                                          customExpression: 'not ip.geoip.country in {"CN"}',
                                          description: "阻止中国以外访问",
                                          action: "challenge",
                                        })
                                      }
                                      className="w-full text-left p-2 bg-muted/50 hover:bg-muted rounded text-xs space-y-1"
                                    >
                                      <div className="font-medium">阻止中国以外访问</div>
                                      <code className="text-[10px] block text-muted-foreground break-all">
                                        not ip.geoip.country in {"{"}\"CN\"{"}"}
                                      </code>
                                      <div className="text-[10px] text-orange-500">⚠️ 需开启 IP Geolocation</div>
                                    </button>

                                    <button
                                      onClick={() =>
                                        setNewFirewallRule({
                                          ...newFirewallRule,
                                          customExpression: '(not ip.geoip.country in {"CN" "US"})',
                                          description: "阻止特定国家访问",
                                          action: "block",
                                        })
                                      }
                                      className="w-full text-left p-2 bg-muted/50 hover:bg-muted rounded text-xs space-y-1"
                                    >
                                      <div className="font-medium">阻止特定国家</div>
                                      <code className="text-[10px] block text-muted-foreground break-all">
                                        (not ip.geoip.country in {"{"}\"CN\" \"US\"{"}"})
                                      </code>
                                    </button>
                                  </div>

                                  <div className="space-y-2 pt-2">
                                    <div className="text-xs font-semibold text-muted-foreground">🤖 爬虫控制</div>

                                    <button
                                      onClick={() =>
                                        setNewFirewallRule({
                                          ...newFirewallRule,
                                          customExpression: "cf.client.bot",
                                          description: "允许搜索引擎爬虫",
                                          action: "allow",
                                        })
                                      }
                                      className="w-full text-left p-2 bg-muted/50 hover:bg-muted rounded text-xs space-y-1"
                                    >
                                      <div className="font-medium">允许搜索引擎爬虫（优先级高）</div>
                                      <code className="text-[10px] block text-muted-foreground break-all">
                                        cf.client.bot
                                      </code>
                                      <div className="text-[10px] text-blue-500">
                                        💡 配合下一条规则使用，先允许搜索引擎
                                      </div>
                                    </button>

                                    <button
                                      onClick={() =>
                                        setNewFirewallRule({
                                          ...newFirewallRule,
                                          customExpression: "not cf.client.bot",
                                          description: "非爬虫流量需验证",
                                          action: "js_challenge",
                                        })
                                      }
                                      className="w-full text-left p-2 bg-muted/50 hover:bg-muted rounded text-xs space-y-1"
                                    >
                                      <div className="font-medium">非爬虫流量需验证（优先级低）</div>
                                      <code className="text-[10px] block text-muted-foreground break-all">
                                        not cf.client.bot
                                      </code>
                                      <div className="text-[10px] text-blue-500">
                                        💡 与上一条规则配合，实现仅允许搜索引擎
                                      </div>
                                    </button>

                                    <button
                                      onClick={() =>
                                        setNewFirewallRule({
                                          ...newFirewallRule,
                                          customExpression:
                                            '(http.user_agent contains "bot") or (http.user_agent contains "crawler") or (http.user_agent contains "spider")',
                                          description: "阻止爬虫访问",
                                          action: "block",
                                        })
                                      }
                                      className="w-full text-left p-2 bg-muted/50 hover:bg-muted rounded text-xs space-y-1"
                                    >
                                      <div className="font-medium">阻止爬虫</div>
                                      <code className="text-[10px] block text-muted-foreground break-all">
                                        (http.user_agent contains "bot") or (http.user_agent contains "crawler") or
                                        (http.user_agent contains "spider")
                                      </code>
                                    </button>

                                    <button
                                      onClick={() =>
                                        setNewFirewallRule({
                                          ...newFirewallRule,
                                          customExpression:
                                            '(http.user_agent contains "Googlebot") or (http.user_agent contains "Bingbot") or (http.user_agent contains "baiduspider")',
                                          description: "仅允许搜索引擎爬虫",
                                          action: "allow",
                                        })
                                      }
                                      className="w-full text-left p-2 bg-muted/50 hover:bg-muted rounded text-xs space-y-1"
                                    >
                                      <div className="font-medium">仅允许搜索引擎爬虫（User-Agent）</div>
                                      <code className="text-[10px] block text-muted-foreground break-all">
                                        (http.user_agent contains "Googlebot") or (http.user_agent contains "Bingbot")
                                        or (http.user_agent contains "baiduspider")
                                      </code>
                                    </button>
                                  </div>

                                  <div className="space-y-2 pt-2">
                                    <div className="text-xs font-semibold text-muted-foreground">🚦 API 保护</div>

                                    <button
                                      onClick={() =>
                                        setNewFirewallRule({
                                          ...newFirewallRule,
                                          customExpression:
                                            '(http.request.uri.path eq "/api/login") and (http.request.method eq "POST")',
                                          description: "保护登录接口",
                                          action: "challenge",
                                        })
                                      }
                                      className="w-full text-left p-2 bg-muted/50 hover:bg-muted rounded text-xs space-y-1"
                                    >
                                      <div className="font-medium">保护登录接口</div>
                                      <code className="text-[10px] block text-muted-foreground break-all">
                                        (http.request.uri.path eq "/api/login") and (http.request.method eq "POST")
                                      </code>
                                    </button>
                                  </div>

                                  <div className="space-y-2 pt-2">
                                    <div className="text-xs font-semibold text-muted-foreground">📱 设备类型</div>

                                    <button
                                      onClick={() =>
                                        setNewFirewallRule({
                                          ...newFirewallRule,
                                          customExpression:
                                            '(http.user_agent contains "Mobile") or (http.user_agent contains "Android") or (http.user_agent contains "iPhone")',
                                          description: "仅允许移动设备访问",
                                          action: "allow",
                                        })
                                      }
                                      className="w-full text-left p-2 bg-muted/50 hover:bg-muted rounded text-xs space-y-1"
                                    >
                                      <div className="font-medium">仅允许移动设备</div>
                                      <code className="text-[10px] block text-muted-foreground break-all">
                                        (http.user_agent contains "Mobile") or (http.user_agent contains "Android") or
                                        (http.user_agent contains "iPhone")
                                      </code>
                                    </button>
                                  </div>

                                  <div className="space-y-2 pt-2">
                                    <div className="text-xs font-semibold text-muted-foreground">🔗 Referer 控制</div>

                                    <button
                                      onClick={() =>
                                        setNewFirewallRule({
                                          ...newFirewallRule,
                                          customExpression:
                                            '(http.referer contains "example.com") or (http.referer eq "")',
                                          description: "防止盗链",
                                          action: "block",
                                        })
                                      }
                                      className="w-full text-left p-2 bg-muted/50 hover:bg-muted rounded text-xs space-y-1"
                                    >
                                      <div className="font-medium">防止盗链</div>
                                      <code className="text-[10px] block text-muted-foreground break-all">
                                        (http.referer contains "example.com") or (http.referer eq "")
                                      </code>
                                    </button>
                                  </div>

                                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-muted-foreground mt-3">
                                    <p className="font-medium mb-2">💡 使用提示：</p>
                                    <ul className="list-disc list-inside space-y-1 text-[11px]">
                                      <li>
                                        使用 <code>and</code> 表示"并且"，<code>or</code> 表示"或者"
                                      </li>
                                      <li>
                                        使用 <code>contains</code> 进行模糊匹配，<code>eq</code> 进行精确匹配
                                      </li>
                                      <li>
                                        使用 <code>not</code> 表示"非"（取反）
                                      </li>
                                      <li>字符串值需要用双引号包裹</li>
                                      <li>点击示例可自动填充表达式</li>
                                      <li>
                                        <code>cf.client.bot</code> 是 Cloudflare 检测的真实爬虫
                                      </li>
                                    </ul>
                                  </div>

                                  <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded text-xs text-muted-foreground">
                                    <p className="font-medium mb-2">⚠️ 关于 CC 攻击防护（速率限制）：</p>
                                    <p className="text-[11px]">
                                      防止 CC 攻击需要使用 Cloudflare 的 <strong>Rate Limiting Rules</strong>{" "}
                                      功能，不在此防火墙规则中配置。
                                      <br />
                                      请前往 Cloudflare 控制台：Security → Rate Limiting Rules 进行配置。
                                      <br />
                                      示例：URL: /*, Method: GET, Threshold: 100次/10秒, Action: Challenge
                                    </p>
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <div>
                              <Label className="text-sm mb-2 block">
                                {newFirewallRule.type === "ip" && "IP 地址"}
                                {newFirewallRule.type === "country" && "国家代码（如 US, CN）"}
                                {newFirewallRule.type === "asn" && "ASN 编号"}
                              </Label>
                              <Input
                                placeholder={
                                  newFirewallRule.type === "ip"
                                    ? "192.168.1.1"
                                    : newFirewallRule.type === "country"
                                      ? "CN"
                                      : "12345"
                                }
                                value={newFirewallRule.value}
                                onChange={(e) => setNewFirewallRule({ ...newFirewallRule, value: e.target.value })}
                              />
                            </div>
                          )}
                          <div className="flex gap-2">
                            {editingFirewallRule && (
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setEditingFirewallRule(null);
                                  setNewFirewallRule({ type: "ip", action: "block", value: "" });
                                }}
                                disabled={isLoading}
                                className="flex-1"
                              >
                                取消
                              </Button>
                            )}
                            <Button
                              onClick={editingFirewallRule ? updateFirewallRule : createFirewallRule}
                              disabled={isLoading}
                              className="flex-1"
                            >
                              {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : editingFirewallRule ? (
                                "更新规则"
                              ) : (
                                "创建规则"
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* 现有规则列表 */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-medium">现有规则</h3>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadFirewallRules(selectedZone)}
                            disabled={isLoading}
                          >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "刷新列表"}
                          </Button>
                        </div>
                        {isLoading ? (
                          <div className="flex justify-center p-8">
                            <Loader2 className="w-6 h-6 animate-spin" />
                          </div>
                        ) : firewallRules.length === 0 ? (
                          <div className="text-center p-8">
                            <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="text-muted-foreground mb-2">暂无防火墙规则</p>
                            <p className="text-xs text-muted-foreground">创建规则后将在此处显示</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {firewallRules.map((rule) => {
                              // WAF Custom Rules 使用 enabled 字段，旧版使用 paused 字段
                              // 优先使用 enabled，如果不存在则使用 paused 的反值
                              const expression = rule.filter?.expression || rule.expression || "N/A";
                              const filterDescription = rule.filter?.description;
                              const enabled = rule.enabled !== undefined 
                                ? rule.enabled 
                                : (rule.paused === false);

                              // 动作颜色映射
                              const actionColorMap: Record<string, string> = {
                                block: "bg-red-500/20 text-red-600 border-red-500/30",
                                challenge: "bg-orange-500/20 text-orange-600 border-orange-500/30",
                                js_challenge: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
                                managed_challenge: "bg-blue-500/20 text-blue-600 border-blue-500/30",
                                allow: "bg-green-500/20 text-green-600 border-green-500/30",
                                log: "bg-gray-500/20 text-gray-600 border-gray-500/30",
                              };

                              return (
                                <div
                                  key={rule.id}
                                  className="p-4 border border-border/50 rounded-lg hover:border-border transition-colors"
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      {/* 规则标题与状态 */}
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="font-medium text-base">{rule.description || "未命名规则"}</div>
                                        <span
                                          className={`text-xs px-2 py-0.5 rounded border ${
                                            actionColorMap[rule.action.toLowerCase()] ||
                                            "bg-muted text-muted-foreground"
                                          }`}
                                        >
                                          {rule.action.toUpperCase()}
                                        </span>
                                        <span
                                          className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${
                                            enabled
                                              ? "bg-green-500/10 text-green-600 border border-green-500/20"
                                              : "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20"
                                          }`}
                                        >
                                          {enabled ? (
                                            <>
                                              <Check className="w-3 h-3" />
                                              已启用
                                            </>
                                          ) : (
                                            <>
                                              <Pause className="w-3 h-3" />
                                              已暂停
                                            </>
                                          )}
                                        </span>
                                      </div>

                                      {/* Filter 描述（如果有） */}
                                      {filterDescription && filterDescription !== rule.description && (
                                        <div className="text-sm text-muted-foreground mb-2">
                                          <span className="font-medium">过滤器：</span>
                                          {filterDescription}
                                        </div>
                                      )}

                                      {/* 表达式显示 */}
                                      <div className="bg-muted/30 p-2 rounded border border-border/30 mb-2">
                                        <div className="text-xs text-muted-foreground mb-1">表达式：</div>
                                        <code className="text-xs font-mono block break-all whitespace-pre-wrap">
                                          {expression}
                                        </code>
                                      </div>

                                      {/* 规则元数据 */}
                                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                        {rule.id && (
                                          <span className="flex items-center gap-1">
                                            <span className="font-medium">ID:</span>
                                            <code className="bg-muted/50 px-1 rounded">{rule.id.slice(0, 8)}...</code>
                                          </span>
                                        )}
                                        {rule.filter?.id && (
                                          <span className="flex items-center gap-1">
                                            <span className="font-medium">Filter ID:</span>
                                            <code className="bg-muted/50 px-1 rounded">
                                              {rule.filter.id.slice(0, 8)}...
                                            </code>
                                          </span>
                                        )}
                                        {rule.created_on && (
                                          <span className="flex items-center gap-1">
                                            <span className="font-medium">创建:</span>
                                            {new Date(rule.created_on).toLocaleString("zh-CN")}
                                          </span>
                                        )}
                                        {rule.modified_on && rule.modified_on !== rule.created_on && (
                                          <span className="flex items-center gap-1">
                                            <span className="font-medium">修改:</span>
                                            {new Date(rule.modified_on).toLocaleString("zh-CN")}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        variant={enabled ? "outline" : "default"}
                                        size="sm"
                                        onClick={() => toggleFirewallRule(rule)}
                                        disabled={isLoading}
                                        title={enabled ? "停止规则" : "启动规则"}
                                      >
                                        {enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          // 解析规则数据以填充编辑表单
                                          let type = "ip";
                                          let value = "";

                                          const expr = expression;
                                          if (expr.includes("ip.src eq")) {
                                            type = "ip";
                                            value = expr.replace("ip.src eq ", "").trim();
                                          } else if (expr.includes("ip.geoip.country")) {
                                            type = "country";
                                            const match = expr.match(/ip\.geoip\.country eq "(.+?)"/);
                                            value = match ? match[1] : "";
                                          } else if (expr.includes("ip.geoip.asnum")) {
                                            type = "asn";
                                            value = expr.replace("ip.geoip.asnum eq ", "").trim();
                                          }

                                          setEditingFirewallRule(rule);
                                          setNewFirewallRule({
                                            type,
                                            action: rule.action,
                                            value,
                                          });

                                          // 滚动到表单顶部
                                          window.scrollTo({ top: 0, behavior: "smooth" });
                                        }}
                                        disabled={isLoading}
                                        title="编辑规则"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteFirewallRule(rule.id)}
                                        disabled={isLoading}
                                        title="删除规则"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* 速率限制规则部分 */}
                      <div className="mt-8 pt-8 border-t border-border/50">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-medium text-lg flex items-center gap-2">
                            <Timer className="w-5 h-5" />
                            速率限制规则
                          </h3>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => loadRateLimitRules(selectedZone)}
                              disabled={isLoading}
                            >
                              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "刷新列表"}
                            </Button>
                            {rateLimitRulesetId && (
                              <Button
                                size="sm"
                                onClick={() => setShowCreateRateLimitForm(true)}
                                disabled={isLoading}
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                创建规则
                              </Button>
                            )}
                          </div>
                        </div>

                        {showCreateRateLimitForm && rateLimitRulesetId && (
                          <div className="p-4 border border-border/50 rounded-lg bg-muted/30 mb-6">
                            <CreateRateLimitRuleForm
                              zoneId={selectedZone}
                              rulesetId={rateLimitRulesetId}
                              email={getCookie("cf_email") || cfEmail}
                              apiKey={getCookie("cf_api_key") || cfApiKey}
                              onSuccess={() => {
                                setShowCreateRateLimitForm(false);
                                loadRateLimitRules(selectedZone);
                              }}
                              onCancel={() => setShowCreateRateLimitForm(false)}
                            />
                          </div>
                        )}

                        {isLoading ? (
                          <div className="flex justify-center p-8">
                            <Loader2 className="w-6 h-6 animate-spin" />
                          </div>
                        ) : !rateLimitRulesetId ? (
                          <div className="text-center p-8 border border-border/50 rounded-lg">
                            <Timer className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="text-muted-foreground mb-2">当前区域未启用速率限制</p>
                            <p className="text-xs text-muted-foreground">
                              速率限制规则集尚未创建，请在 Cloudflare 控制台中启用
                            </p>
                          </div>
                        ) : rateLimitRules.length === 0 ? (
                          <div className="text-center p-8 border border-border/50 rounded-lg">
                            <Timer className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="text-muted-foreground mb-2">暂无速率限制规则</p>
                            <p className="text-xs text-muted-foreground">点击上方按钮创建规则</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {rateLimitRules.map((rule) => {
                              const enabled = rule.enabled !== false;
                              const ratelimit = rule.ratelimit || {};

                              return (
                                <div
                                  key={rule.id}
                                  className="p-4 border border-border/50 rounded-lg hover:border-border transition-colors"
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="font-medium text-base">{rule.description || "未命名规则"}</div>
                                        <span className="text-xs px-2 py-0.5 rounded border bg-red-500/20 text-red-600 border-red-500/30">
                                          {rule.action.toUpperCase()}
                                        </span>
                                        <span
                                          className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${
                                            enabled
                                              ? "bg-green-500/10 text-green-600 border border-green-500/20"
                                              : "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20"
                                          }`}
                                        >
                                          {enabled ? (
                                            <>
                                              <Check className="w-3 h-3" />
                                              已启用
                                            </>
                                          ) : (
                                            <>
                                              <Pause className="w-3 h-3" />
                                              已暂停
                                            </>
                                          )}
                                        </span>
                                      </div>

                                      <div className="bg-muted/30 p-2 rounded border border-border/30 mb-2">
                                        <div className="text-xs text-muted-foreground mb-1">表达式：</div>
                                        <code className="text-xs font-mono block break-all whitespace-pre-wrap">
                                          {rule.expression || "N/A"}
                                        </code>
                                      </div>

                                      <div className="grid grid-cols-2 gap-3 text-xs bg-muted/20 p-3 rounded">
                                        <div>
                                          <span className="font-medium text-muted-foreground">时间窗口:</span>
                                          <span className="ml-2">{ratelimit.period || 0} 秒</span>
                                        </div>
                                        <div>
                                          <span className="font-medium text-muted-foreground">请求限制:</span>
                                          <span className="ml-2">{ratelimit.requests_per_period || 0} 次</span>
                                        </div>
                                        <div>
                                          <span className="font-medium text-muted-foreground">封禁时长:</span>
                                          <span className="ml-2">{ratelimit.mitigation_timeout || 0} 秒</span>
                                        </div>
                                        <div>
                                          <span className="font-medium text-muted-foreground">计数特征:</span>
                                          <span className="ml-2">{ratelimit.characteristics?.join(", ") || "N/A"}</span>
                                        </div>
                                      </div>

                                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
                                        {rule.id && (
                                          <span className="flex items-center gap-1">
                                            <span className="font-medium">ID:</span>
                                            <code className="bg-muted/50 px-1 rounded">{rule.id.slice(0, 8)}...</code>
                                          </span>
                                        )}
                                        {rule.last_updated && (
                                          <span className="flex items-center gap-1">
                                            <span className="font-medium">更新:</span>
                                            {new Date(rule.last_updated).toLocaleString("zh-CN")}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* 说明文档 */}
                      <div className="p-4 border border-border/50 rounded-lg bg-muted/20 mt-6">
                        <h3 className="font-medium mb-2">规则说明</h3>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>
                            • <strong>IP 地址</strong>: 匹配特定 IP 地址
                          </li>
                          <li>
                            • <strong>国家/地区</strong>: 匹配来自特定国家的请求（使用 ISO 3166-1 Alpha 2 代码）
                          </li>
                          <li>
                            • <strong>ASN</strong>: 匹配特定自治系统号的请求
                          </li>
                          <li>
                            • <strong>允许</strong>: 允许匹配的请求通过
                          </li>
                          <li>
                            • <strong>阻止</strong>: 阻止匹配的请求
                          </li>
                          <li>
                            • <strong>质询</strong>: 显示 CAPTCHA 验证
                          </li>
                          <li>
                            • <strong>JS 质询</strong>: 使用 JavaScript 挑战验证客户端
                          </li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeView === "analytics" && selectedZone && (
              <AnalyticsView
                points={analyticsPoints}
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

            {activeView === "page-rules" && selectedZone && (
              <PageRulesView
                selectedZoneName={selectedZoneName}
                isLoading={isLoading}
                editingPageRuleId={editingPageRuleId}
                pageRules={pageRules}
                newPageRule={newPageRule}
                onBack={() => {
                  setActiveView("zones");
                  setSelectedZone("");
                  setSelectedZoneName("");
                }}
                onFormChange={setNewPageRule}
                onResetForm={() => {
                  setNewPageRule(createEmptyPageRuleForm());
                  setEditingPageRuleId(null);
                }}
                onSubmit={createOrUpdatePageRule}
                onRefresh={loadPageRules}
                onToggleRule={handleTogglePageRule}
                onEditRule={handleEditPageRule}
                onDeleteRule={handleDeletePageRule}
              />
            )}

            {activeView === "kv-storage" && (
              <KvStorageView
                kvNamespaces={kvNamespaces}
                selectedKvNamespace={selectedKvNamespace}
                kvKeys={kvKeys}
                selectedKvKeys={selectedKvKeys}
                isLoading={isLoading}
                onCreateNamespace={handleCreateKvNamespace}
                onRefreshNamespaces={handleRefreshKvNamespaces}
                onDeleteNamespace={handleDeleteKvNamespace}
                onNamespaceChange={setSelectedKvNamespace}
                onSaveKeyValue={handleSaveKvKeyValue}
                onReadValue={handleReadKvValue}
                onDeleteKey={handleDeleteKvKey}
                onExportKeys={handleExportKvKeys}
                onImportKeys={handleImportKvKeys}
                onLoadKeys={handleLoadKvKeys}
                onDeleteSelectedKeys={handleDeleteSelectedKvKeys}
                onToggleKeySelection={(keyName, checked) =>
                  setSelectedKvKeys((prev) =>
                    checked ? [...prev, keyName] : prev.filter((n) => n !== keyName),
                  )
                }
              />
            )}

            {activeView === "certificates" && (
              <div className="max-w-4xl mx-auto">
                {selectedZone ? (
                  <CertificatesView
                    certificates={certificates}
                    isLoading={isLoading}
                    selectedZoneName={selectedZoneName}
                    onBack={() => {
                      setActiveView("zones");
                      setSelectedZone("");
                      setSelectedZoneName("");
                    }}
                    onRefresh={loadCertificates}
                  />
                ) : (
                  <Card className="shadow-card">
                    <CardContent className="py-16 text-center">
                      <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">请先选择域名</h3>
                      <p className="text-muted-foreground mb-6">证书管理需要选择一个域名才能使用</p>
                      <Button onClick={() => setActiveView("zones")}>前往域名管理</Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* D1 数据库管理 */}
            {activeView === "d1-database" && (
              <D1DatabaseView
                databases={d1Databases}
                selectedDatabase={selectedD1Database}
                sqlQuery={d1SqlQuery}
                queryHistory={d1QueryHistory}
                historyIndex={d1HistoryIndex}
                queryResult={d1QueryResult}
                isLoading={isLoading}
                isExecutingQuery={isExecutingD1Query}
                canCreate={zones.length > 0}
                onSelectDatabase={setSelectedD1Database}
                onSqlQueryChange={setD1SqlQuery}
                onHistoryIndexChange={setD1HistoryIndex}
                onRunQuery={handleRunD1Query}
                onRefresh={loadD1Databases}
                onOpenCreateDialog={() => setShowCreateD1DatabaseForm(true)}
                onDeleteDatabase={handleDeleteD1Database}
              />
            )}

            {/* R2 存储桶管理 */}
            {activeView === "r2-storage" && (
              <R2StorageView
                buckets={Array.isArray(r2Buckets) ? r2Buckets : []}
                selectedBucket={selectedR2Bucket}
                files={r2Files}
                error={r2Error}
                isLoading={isLoading}
                isLoadingFiles={isLoadingR2Files}
                isUploading={uploadingFile}
                showS3Config={showR2S3Config}
                accountId={zones[0]?.account?.id}
                onSelectBucket={(bucketName) => {
                  setSelectedR2Bucket(bucketName);
                  setShowR2S3Config(false);
                }}
                onShowS3Config={handleShowR2S3Config}
                onCloseS3Config={() => setShowR2S3Config(false)}
                onRefreshBuckets={loadR2Buckets}
                onRefreshFiles={handleRefreshR2Files}
                onUploadFile={handleUploadR2File}
                onDeleteBucket={handleDeleteR2Bucket}
                onOpenExamples={() => window.open("https://developers.cloudflare.com/r2/examples/", "_blank")}
                onCopy={handleCopyText}
              />
            )}

            {/* Cloudflare Tunnels 管理 */}
            {activeView === "tunnels" && (
              <TunnelsView
                tunnels={tunnels}
                isLoading={isLoading}
                canManage={zones.length > 0}
                onRefresh={loadTunnels}
                onCreate={() => setCreateTunnelOpen(true)}
                onEdit={handleEditTunnel}
                onConfig={handleTunnelConfig}
                onRoute={handleTunnelRoute}
                onDelete={handleDeleteTunnel}
              />
            )}

            {/* 操作历史 */}
            {activeView === "operation-history" && (
              <div className="max-w-7xl mx-auto">
                <OperationHistoryPanel userId={cfEmail} />
              </div>
            )}

            {/* Worker 模板库 */}
            {activeView === "worker-templates" && (
              <div className="max-w-7xl mx-auto">
                <WorkerTemplateLibrary userId={cfEmail} />
              </div>
            )}

            {/* 需求开发 */}
            {activeView === "feedback" && (
              <div className="max-w-7xl mx-auto">
                <FeedbackLibrary userId={cfEmail} isAdmin={isAdmin} />
              </div>
            )}

            {/* 自动优化设置 */}
            {activeView === "auto-optimization" && selectedZone && (
              <div className="max-w-6xl mx-auto">
                <AutoOptimizationPanel
                  zoneId={selectedZone}
                  userId={cfEmail}
                  zoneName={selectedZoneName}
                  email={cfEmail}
                  apiKey={cfApiKey}
                />
              </div>
            )}

            {activeView === "auto-optimization" && !selectedZone && (
              <div className="max-w-6xl mx-auto">
                <Card>
                  <CardContent className="py-12 text-center">
                    <Settings className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">请先选择一个域名</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Pages 管理 */}
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
                onOpenDashboard={() => window.open("https://dash.cloudflare.com/?to=/:account/pages", "_blank")}
                onOpenProjectDashboard={(projectName) => {
                  const accountId = zones[0]?.account?.id;
                  if (accountId && projectName) {
                    window.open(
                      `https://dash.cloudflare.com/${accountId}/pages/view/${projectName}`,
                      "_blank",
                    );
                  }
                }}
                onOpenDeployments={(projectName) => {
                  setSelectedPagesProject(projectName);
                  setShowPagesDeployments(true);
                  loadPagesDeployments(projectName);
                }}
                onCloseDeployments={() => {
                  setShowPagesDeployments(false);
                  setSelectedPagesProject("");
                  setPagesDeployments([]);
                }}
                onRetryDeployment={async (deploymentId) => {
                  const email = getCookie("cf_email");
                  const apiKey = getCookie("cf_api_key");
                  if (!email || !apiKey || zones.length === 0) return;

                  const accountId = zones[0]?.account?.id;
                  if (!accountId || !selectedPagesProject) return;

                  const deployment = pagesDeployments.find((d) => d.id === deploymentId);
                  if (!deployment) return;

                  if (
                    !confirm(
                      `确定要重新部署此版本吗？\n\n部署 ID: ${deploymentId.slice(0, 8)}\n环境: ${deployment.environment}`,
                    )
                  )
                    return;

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

                    if (data.success) {
                      toast({
                        title: "重新部署成功",
                        description: "部署已开始，请稍候...",
                      });
                      setTimeout(() => loadPagesDeployments(selectedPagesProject), 2000);
                    } else {
                      throw new Error(data.errors?.[0]?.message || "重新部署失败");
                    }
                  } catch (err) {
                    console.error("Retry deployment error:", err);
                    toast({
                      title: "重新部署失败",
                      description: errorMessage(err),
                      variant: "destructive",
                    });
                  } finally {
                    setIsLoadingPages(false);
                  }
                }}
                onCopyText={(text, description) => {
                  navigator.clipboard.writeText(text);
                  toast({ description });
                }}
              />
            )}
          </main>
        </div>
      </div>

      {/* 删除 Worker 确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除 Worker</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将永久删除 Worker 及其相关的路由和 DNS 记录。
              <br />
              <br />
              请输入 Worker 名称 <span className="font-mono font-semibold text-destructive">
                {workerToDelete?.id}
              </span>{" "}
              以确认删除：
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              placeholder="输入 Worker 名称"
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && deleteConfirmInput === workerToDelete?.id) {
                  confirmDeleteWorker();
                }
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteConfirmInput("");
                setWorkerToDelete(null);
              }}
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteWorker}
              disabled={deleteConfirmInput !== workerToDelete?.id}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 编辑 Worker 对话框 */}
      {isCloudflareProvider && editingWorker && zones.length > 0 && zones[0]?.account?.id && (
        <EditWorkerForm
          open={editWorkerOpen}
          onOpenChange={setEditWorkerOpen}
          workerId={editingWorker.id}
          workerName={editingWorker.name}
          accountId={zones[0].account.id}
          email={getCookie("cf_email") || cfEmail}
          apiKey={getCookie("cf_api_key") || cfApiKey}
          currentBindings={workerBindings}
          onSuccess={() => {
            loadWorkers();
            // 重新加载 bindings
            if (selectedWorker) {
              loadWorkerBindings(selectedWorker, zones[0].account.id);
            }
          }}
        />
      )}

      {/* 新建 Worker 对话框 */}
      {isCloudflareProvider && zones.length > 0 && zones[0]?.account?.id && (
        <CreateWorkerForm
          open={createWorkerOpen}
          onOpenChange={setCreateWorkerOpen}
          accountId={zones[0].account.id}
          email={getCookie("cf_email") || cfEmail}
          apiKey={getCookie("cf_api_key") || cfApiKey}
          onSuccess={() => {
            loadWorkers();
          }}
        />
      )}

      {/* 绑定 D1 数据库对话框 */}
      {isCloudflareProvider && workerForD1Binding && zones.length > 0 && zones[0]?.account?.id && (
        <BindD1DatabaseForm
          open={bindD1Open}
          onOpenChange={setBindD1Open}
          workerId={workerForD1Binding.id}
          workerName={workerForD1Binding.name}
          accountId={zones[0].account.id}
          email={getCookie("cf_email") || cfEmail}
          apiKey={getCookie("cf_api_key") || cfApiKey}
          onSuccess={() => {
            // 刷新Worker详情
            setActiveView("workers");
            loadWorkers();
            if (zones[0]?.account?.id) {
              loadWorkerBindings(workerForD1Binding.id, zones[0].account.id);
            }
          }}
        />
      )}

      {/* 绑定 R2 存储桶对话框 */}
      {isCloudflareProvider && workerForR2Binding && zones.length > 0 && zones[0]?.account?.id && (
        <BindR2BucketForm
          open={bindR2Open}
          onOpenChange={setBindR2Open}
          workerId={workerForR2Binding.id}
          workerName={workerForR2Binding.name}
          accountId={zones[0].account.id}
          email={getCookie("cf_email") || cfEmail}
          apiKey={getCookie("cf_api_key") || cfApiKey}
          onSuccess={() => {
            setActiveView("workers");
            loadWorkers();
            if (zones[0]?.account?.id) {
              loadWorkerBindings(workerForR2Binding.id, zones[0].account.id);
            }
          }}
        />
      )}

      {/* 绑定 KV 命名空间对话框 */}
      {isCloudflareProvider && workerForKVBinding && zones.length > 0 && zones[0]?.account?.id && (
        <BindKVNamespaceForm
          open={bindKVOpen}
          onOpenChange={setBindKVOpen}
          workerId={workerForKVBinding.id}
          workerName={workerForKVBinding.name}
          accountId={zones[0].account.id}
          email={getCookie("cf_email") || cfEmail}
          apiKey={getCookie("cf_api_key") || cfApiKey}
          onSuccess={() => {
            setActiveView("workers");
            loadWorkers();
            if (zones[0]?.account?.id) {
              loadWorkerBindings(workerForKVBinding.id, zones[0].account.id);
            }
          }}
        />
      )}

      {/* 创建 D1 数据库对话框 */}
      {isCloudflareProvider && zones.length > 0 && zones[0]?.account?.id && (
        <CreateD1DatabaseForm
          open={showCreateD1DatabaseForm}
          onOpenChange={setShowCreateD1DatabaseForm}
          email={getCookie("cf_email") || cfEmail}
          apiKey={getCookie("cf_api_key") || cfApiKey}
          accountId={zones[0].account.id}
          onSuccess={() => {
            loadD1Databases();
          }}
        />
      )}

      {/* 管理 Worker 变量对话框 */}
      {isCloudflareProvider && workerForVariables && zones.length > 0 && zones[0]?.account?.id && (
        <ManageWorkerVariablesForm
          open={manageVariablesOpen}
          onOpenChange={setManageVariablesOpen}
          workerId={workerForVariables.id}
          workerName={workerForVariables.name}
          accountId={zones[0].account.id}
          email={getCookie("cf_email") || cfEmail}
          apiKey={getCookie("cf_api_key") || cfApiKey}
          onSuccess={() => {
            loadWorkers();
          }}
        />
      )}

      {/* Tunnel 管理对话框 */}
      {isCloudflareProvider && zones.length > 0 && zones[0].account && (
        <>
          <CreateTunnelForm
            open={createTunnelOpen}
            onOpenChange={setCreateTunnelOpen}
            accountId={zones[0].account.id}
            email={getCookie("cf_email") || cfEmail}
            apiKey={getCookie("cf_api_key") || cfApiKey}
            onSuccess={() => {
              loadTunnels();
            }}
          />

          {selectedTunnel && (
            <>
              <EditTunnelForm
                open={editTunnelOpen}
                onOpenChange={setEditTunnelOpen}
                tunnel={selectedTunnel}
                accountId={zones[0].account.id}
                email={getCookie("cf_email") || cfEmail}
                apiKey={getCookie("cf_api_key") || cfApiKey}
                onSuccess={() => {
                  loadTunnels();
                }}
              />

              <TunnelConfigForm
                open={tunnelConfigOpen}
                onOpenChange={setTunnelConfigOpen}
                tunnel={selectedTunnel}
                accountId={zones[0].account.id}
                email={getCookie("cf_email") || cfEmail}
                apiKey={getCookie("cf_api_key") || cfApiKey}
              />

              <TunnelRouteForm
                open={tunnelRouteOpen}
                onOpenChange={setTunnelRouteOpen}
                tunnel={selectedTunnel}
                accountId={zones[0].account.id}
                email={getCookie("cf_email") || cfEmail}
                apiKey={getCookie("cf_api_key") || cfApiKey}
                onSuccess={() => {
                  loadTunnels();
                }}
              />
            </>
          )}
        </>
      )}

      {/* 新建 Pages 项目对话框 */}
      <CreatePagesProjectDialog
        open={createPagesProjectOpen}
        onOpenChange={setCreatePagesProjectOpen}
        onSelectMethod={(method) => {
          const accountId = zones[0]?.account?.id;
          if (!accountId) return;
          const path = method === "upload" ? "/pages/new/upload" : "/pages/new";
          window.open(`https://dash.cloudflare.com/${accountId}${path}`, "_blank");
          setCreatePagesProjectOpen(false);
          toast({
            title: "正在前往 Dashboard",
            description: "完成后返回刷新即可看到新项目",
          });
        }}
      />
    </SidebarProvider>
  );
};

export default Index;
