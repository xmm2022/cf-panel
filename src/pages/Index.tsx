import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-adapter";
import { useToast } from "@/hooks/use-toast";
import { getCookie, setCookie } from "@/lib/cookies";
import { setCloudflareCredentials, clearCloudflareCredentials } from "@/lib/cloudflare-credentials";
import {
  CloudflareAccount,
  getAllAccounts,
  getCurrentAccount,
  saveAccount,
  setCurrentAccount,
  deleteAccount,
} from "@/lib/accounts-storage";
import { recordOperation } from "@/lib/operation-logger";
import { invokeWorkerApi } from "@/lib/cloudflare-worker-api";
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
import type { AnalyticsData, AnalyticsPeriod } from "@/components/index-page/analytics/analytics-types";
import { PagesView } from "@/components/index-page/pages/PagesView";
import { CreatePagesProjectDialog } from "@/components/index-page/pages/CreatePagesProjectDialog";
import type { PagesDeploymentSummary, PagesProjectSummary } from "@/components/index-page/pages/pages-types";
import { KvStorageView } from "@/components/index-page/kv-storage/KvStorageView";
import { ProviderSwitcher } from "@/components/ProviderSwitcher";
import {
  buildKvExportFileName,
  parseKvImportJson,
} from "@/components/index-page/kv-storage/kv-storage-actions";
import type { KvImportEntry } from "@/components/index-page/kv-storage/kv-storage-types";
import type { ProviderId } from "@/lib/providers/types";
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

interface D1DatabaseSummary {
  uuid: string;
  name: string;
  version?: string;
  created_at: string;
}

interface R2BucketSummary {
  name: string;
  creation_date: string;
  location?: string;
}

interface TunnelConnection {
  id?: string;
  colo_name?: string;
  client_ip?: string;
}

interface TunnelSummary {
  id: string;
  name: string;
  created_at: string;
  status?: string;
  deleted_at?: string | null;
  connections?: TunnelConnection[];
}

interface CertificateSummary {
  id: string;
  hosts?: string[];
  expires_on: string;
  status: string;
}

interface KVNamespaceSummary {
  id: string;
  title: string;
}

interface KVKeySummary {
  name: string;
}

interface ZoneSetting {
  id: string;
  value: string | number | { strict_transport_security?: { enabled?: boolean } };
}

interface R2ObjectSummary {
  key: string;
  size?: number;
  uploaded?: string;
}

interface D1QueryResult {
  results?: Array<Record<string, unknown>>;
  result?: Array<Record<string, unknown>>;
  meta?: {
    duration?: number;
    changes?: number;
  };
}

interface FirewallRuleFilter {
  id?: string;
}

interface FirewallRule {
  id: string;
  paused?: boolean;
  filter?: FirewallRuleFilter;
}

interface RateLimitRule {
  id: string;
}

interface PageRuleAction {
  id: string;
  value?: string | number | { status_code: number; url: string };
}

interface PageRuleTarget {
  constraint?: {
    value?: string;
  };
}

interface PageRule {
  id: string;
  status: "active" | "disabled";
  priority?: number;
  targets?: PageRuleTarget[];
  actions?: PageRuleAction[];
}

const isProviderId = (value: string | null): value is ProviderId =>
  value === "cloudflare" || value === "edgeone" || value === "esa";

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
  const [activeView, setActiveView] = useState<
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
    | "pages"
  >("zones");
  const [dnsNavClicks, setDnsNavClicks] = useState(0);
  const [d1Databases, setD1Databases] = useState<D1DatabaseSummary[]>([]);
  const [r2Buckets, setR2Buckets] = useState<R2BucketSummary[]>([]);
  const [tunnels, setTunnels] = useState<TunnelSummary[]>([]);
  const [certificates, setCertificates] = useState<CertificateSummary[]>([]);
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
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
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
  const [pageRules, setPageRules] = useState<PageRule[]>([]);

  // 页面规则表单状态
  const [editingPageRuleId, setEditingPageRuleId] = useState<string | null>(null);
  const [newPageRule, setNewPageRule] = useState({
    urlPattern: "",
    cacheLevel: "",
    browserCacheTtl: "",
    securityLevel: "",
    ssl: "",
    alwaysUseHttps: "",
    forwardingType: "",
    forwardingUrl: "",
    status: "active" as "active" | "disabled",
  });

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

  const handleProviderChange = (nextProviderId: ProviderId) => {
    setActiveProviderId(nextProviderId);
    setSearchParams((previousParams) => {
      const nextParams = new URLSearchParams(previousParams);
      nextParams.set("provider", nextProviderId);
      return nextParams;
    });
    setSelectedZone("");
    setSelectedZoneName("");
    setDnsRecords([]);
    setWorkerRoutes([]);
    setActiveView("zones");
  };

  // 首次进入页面规则视图时加载规则列表
  useEffect(() => {
    if (activeView === "page-rules" && selectedZone) {
      loadPageRules();
    }
  }, [activeView, selectedZone]);

  // 首次进入 KV 存储视图时加载命名空间列表
  useEffect(() => {
    if (activeView === "kv-storage" && zones.length > 0) {
      loadKvNamespaces();
    }
  }, [activeView, zones]);

  // 首次进入统计分析视图时加载数据
  useEffect(() => {
    if (activeView === "analytics" && selectedZone) {
      loadAnalytics(selectedZone);
    }
    // loader callback stabilization is deferred to Task 8
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, selectedZone]);

  // 首次进入 Pages 视图时加载项目列表
  useEffect(() => {
    if (activeView === "pages" && zones.length > 0) {
      loadPagesProjects();
    }
  }, [activeView, zones]);

  // 从 D1 数据库加载 Workers 隐藏设置
  const loadWorkersHiddenSetting = async () => {
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
  };

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
  }, [showWorkers, workerShortcutClicks, workerPermanentlyVisible, workersHiddenByDefault]);

  // 初始化时加载保存的账号和当前账号
  useEffect(() => {
    // 加载所有保存的账号
    const accounts = getAllAccounts();
    setSavedAccounts(accounts);

    // 尝试恢复当前账号
    const currentAcc = getCurrentAccount();

    // 迁移旧的 sessionStorage 或 cookie 凭据到新的账号系统
    const oldEmail = sessionStorage.getItem("cf_email");
    const oldApiKey = sessionStorage.getItem("cf_api_key");
    const cookieEmail = getCookie("cf_email");
    const cookieApiKey = getCookie("cf_api_key");

    if (oldEmail && oldApiKey) {
      // 迁移 sessionStorage
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
      // 迁移 cookie 到账号系统
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
      // 使用保存的当前账号
      setCfEmail(currentAcc.email);
      setCfApiKey(currentAcc.apiKey);
      setCloudflareCredentials(currentAcc.email, currentAcc.apiKey);
      setHasCredentials(true);
      setCurrentAccountId(currentAcc.id);

      // 同时设置 cookie，确保删除等功能可用
      setCookie("cf_email", currentAcc.email, 30);
      setCookie("cf_api_key", currentAcc.apiKey, 30);

      setTimeout(() => loadZones({ email: currentAcc.email, apiKey: currentAcc.apiKey }), 100);
    }

    // 加载 Workers 隐藏设置
    if (hasCredentials) {
      loadWorkersHiddenSetting();
    }
  }, [hasCredentials]);

  const loadPageRules = async () => {
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

      if (data.success) {
        setPageRules(data.result || []);
      } else {
        toast({
          title: "加载页面规则失败",
          description: data.errors?.[0]?.message || "未知错误",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Load page rules error:", error);
      toast({
        title: "加载页面规则失败",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createOrUpdatePageRule = async () => {
    const email = getCookie("cf_email") || cfEmail;
    const apiKey = getCookie("cf_api_key") || cfApiKey;
    if (!email || !apiKey || !selectedZone) return;

    // 验证必填字段
    if (!newPageRule.urlPattern.trim()) {
      toast({
        title: "请填写 URL 模式",
        variant: "destructive",
      });
      return;
    }

    // 构建 actions 数组
    const actions: PageRuleAction[] = [];

    // 检查是否有互斥的设置
    const hasForwarding = newPageRule.forwardingType && newPageRule.forwardingUrl.trim();
    const hasAlwaysHttps = newPageRule.alwaysUseHttps === "on";

    // forwarding_url 和 always_use_https 不能与其他设置共存
    if (hasForwarding) {
      actions.push({
        id: "forwarding_url",
        value: {
          url: newPageRule.forwardingUrl.trim(),
          status_code: parseInt(newPageRule.forwardingType),
        },
      });
    } else if (hasAlwaysHttps) {
      // always_use_https 必须单独使用
      actions.push({ id: "always_use_https" });
    } else {
      // 其他设置只有在不使用 forwarding 和 always_https 时才添加
      if (newPageRule.cacheLevel && newPageRule.cacheLevel !== "") {
        actions.push({ id: "cache_level", value: newPageRule.cacheLevel });
      }

      if (newPageRule.browserCacheTtl && newPageRule.browserCacheTtl !== "") {
        actions.push({ id: "browser_cache_ttl", value: parseInt(newPageRule.browserCacheTtl) });
      }

      if (newPageRule.securityLevel && newPageRule.securityLevel !== "") {
        actions.push({ id: "security_level", value: newPageRule.securityLevel });
      }

      if (newPageRule.ssl && newPageRule.ssl !== "") {
        actions.push({ id: "ssl", value: newPageRule.ssl });
      }
    }

    if (actions.length === 0) {
      toast({
        title: "请至少选择一个规则设置",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // 如果是创建新规则，先尝试创建DNS记录
      if (!editingPageRuleId) {
        try {
          // 从URL模式中提取域名
          const urlPattern = newPageRule.urlPattern.trim();
          let hostname = "";

          // 移除协议前缀
          const cleanUrl = urlPattern.replace(/^https?:\/\//, "");

          // 提取域名部分（移除路径）
          const pathIndex = cleanUrl.indexOf("/");
          hostname = pathIndex > 0 ? cleanUrl.substring(0, pathIndex) : cleanUrl;

          // 移除通配符
          hostname = hostname.replace(/\*/g, "").replace(/^\.+/, "");

          if (hostname && hostname.includes(".")) {
            // 创建DNS A记录，开启代理
            const dnsResult = await supabase.functions.invoke("cloudflare-api", {
              body: {
                action: "create_dns_record",
                email,
                apiKey,
                zoneId: selectedZone,
                recordData: {
                  type: "A",
                  name: hostname,
                  content: "223.5.5.5", // 使用文档用途的保留IP
                  proxied: true, // 开启Cloudflare代理
                  ttl: 1, // 自动TTL
                },
              },
            });

            // DNS记录创建成功或已存在都继续
            if (dnsResult.data?.success || dnsResult.data?.errors?.[0]?.code === 81057) {
              // 81057 = Record already exists
              console.log("DNS记录已就绪:", hostname);
            }
          }
        } catch (dnsError) {
          console.log("自动创建DNS记录失败，继续创建页面规则:", dnsError);
          // 不阻断页面规则创建流程
        }
      }

      const ruleData = {
        targets: [
          {
            target: "url",
            constraint: {
              operator: "matches",
              value: newPageRule.urlPattern.trim(),
            },
          },
        ],
        actions: actions,
        status: newPageRule.status,
      };

      const { data, error } = await supabase.functions.invoke("cloudflare-api", {
        body: editingPageRuleId
          ? {
              action: "update_page_rule",
              email,
              apiKey,
              zoneId: selectedZone,
              pageRuleId: editingPageRuleId,
              ruleData,
            }
          : {
              action: "create_page_rule",
              email,
              apiKey,
              zoneId: selectedZone,
              ruleData,
            },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: editingPageRuleId ? "页面规则更新成功" : "页面规则创建成功",
          description: editingPageRuleId ? undefined : "已自动创建对应的DNS记录（如不存在）",
        });
        // 重置表单
        setNewPageRule({
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
        setEditingPageRuleId(null);
        // 刷新列表
        await loadPageRules();
      } else {
        const errorMessages =
          data.messages?.map((m: { message: string }) => m.message).join("\n") || data.errors?.[0]?.message || "未知错误";
        toast({
          title: editingPageRuleId ? "更新失败" : "创建失败",
          description: errorMessages,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Create/Update page rule error:", error);
      toast({
        title: editingPageRuleId ? "更新失败" : "创建失败",
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
    setAnalyticsData(null);
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
    setNewPageRule({
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

  const loadD1Databases = async () => {
    const email = getCookie("cf_email") || cfEmail;
    const apiKey = getCookie("cf_api_key") || cfApiKey;
    if (!email || !apiKey || zones.length === 0) return;

    const accountId = zones[0]?.account?.id;
    if (!accountId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cloudflare-api", {
        body: {
          action: "list_d1_databases",
          email,
          apiKey,
          accountId,
        },
      });

      if (error) throw error;

      if (data.success) {
        setD1Databases(data.result || []);
      } else {
        toast({
          title: "加载 D1 数据库失败",
          description: data.errors?.[0]?.message || "未知错误",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Load D1 databases error:", error);
      toast({
        title: "加载失败",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadKvNamespaces = async () => {
    const email = getCookie("cf_email") || cfEmail;
    const apiKey = getCookie("cf_api_key") || cfApiKey;
    if (!email || !apiKey || zones.length === 0) return;

    const accountId = zones[0]?.account?.id;
    if (!accountId) return;

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

      if (data.success) {
        setKvNamespaces(data.result || []);
      } else {
        toast({
          title: "加载 KV 命名空间失败",
          description: data.errors?.[0]?.message || "未知错误",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Load KV namespaces error:", error);
      toast({
        title: "加载失败",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateKvNamespace = async (namespaceName: string) => {
    if (!namespaceName) {
      toast({
        title: "请输入命名空间名称",
        variant: "destructive",
      });
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
          action: "list_kv_namespaces",
          email,
          apiKey,
          accountId,
        },
      });

      if (error) throw error;

      if (data.success) {
        setKvNamespaces(data.result || []);
        toast({
          title: `列表已刷新 (${data.result?.length || 0} 个命名空间)`,
        });
      } else {
        toast({
          title: "加载失败",
          description: data.errors?.[0]?.message || "未知错误",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Load namespaces error:", error);
      toast({
        title: "加载失败",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
    const email = getCookie("cf_email") || cfEmail;
    const apiKey = getCookie("cf_api_key") || cfApiKey;
    const accountId = zones[0]?.account?.id;
    if (!email || !apiKey || !accountId) {
      toast({ title: "缺少凭证或账户信息", variant: "destructive" });
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
    } catch (e: any) {
      toast({
        title: "删除失败",
        description: e.message,
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
    } catch (e: any) {
      toast({ title: "保存失败", description: e.message, variant: "destructive" });
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
    } catch (e: any) {
      toast({ title: "读取失败", description: e.message, variant: "destructive" });
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
    } catch (e: any) {
      toast({ title: "删除失败", description: e.message, variant: "destructive" });
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
    } catch (e: any) {
      toast({ title: "导出失败", description: e.message, variant: "destructive" });
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
    } catch (err: any) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("数组")) {
        toast({ title: "格式错误，应为数组", variant: "destructive" });
      } else {
        toast({ title: "JSON 解析失败", variant: "destructive" });
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
    } catch (e: any) {
      toast({ title: "导入失败", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadKvKeys = async () => {
    if (!selectedKvNamespace) {
      toast({ title: "请选择命名空间", variant: "destructive" });
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
    } catch (e: any) {
      toast({ title: "加载失败", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSelectedKvKeys = async () => {
    if (!selectedKvNamespace || selectedKvKeys.length === 0) return;
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
    } catch (e: any) {
      toast({ title: "批量删除失败", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const loadR2Buckets = async () => {
    const email = getCookie("cf_email") || cfEmail;
    const apiKey = getCookie("cf_api_key") || cfApiKey;
    if (!email || !apiKey || zones.length === 0) return;

    const accountId = zones[0]?.account?.id;
    if (!accountId) return;

    setIsLoading(true);
    setR2Error(null);
    setR2Buckets([]); // 确保重置为空数组
    try {
      const { data, error } = await supabase.functions.invoke("cloudflare-api", {
        body: {
          action: "list_r2_buckets",
          email,
          apiKey,
          accountId,
        },
      });

      if (error) throw error;

      if (data.success) {
        // R2 API 返回的是 result.buckets 结构
        const buckets = data.result?.buckets || [];
        setR2Buckets(Array.isArray(buckets) ? buckets : []);
      } else {
        const errorMsg = data.errors?.[0]?.message || "未知错误";
        setR2Error(errorMsg);
        setR2Buckets([]); // 确保是数组
      }
    } catch (error) {
      console.error("Load R2 buckets error:", error);
      setR2Error("加载失败，请稍后重试");
      setR2Buckets([]); // 确保是数组
    } finally {
      setIsLoading(false);
    }
  };

  const loadTunnels = async () => {
    const email = getCookie("cf_email") || cfEmail;
    const apiKey = getCookie("cf_api_key") || cfApiKey;
    if (!email || !apiKey || zones.length === 0) return;

    const accountId = zones[0]?.account?.id;
    if (!accountId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cloudflare-api", {
        body: {
          action: "list_tunnels",
          email,
          apiKey,
          accountId,
        },
      });

      if (error) throw error;

      if (data.success) {
        // 过滤掉已删除的 tunnel（deleted_at 不为 null）
        const activeTunnels = (data.result || []).filter((tunnel: TunnelSummary) => !tunnel.deleted_at);
        setTunnels(activeTunnels);
      } else {
        toast({
          title: "加载 Tunnels 失败",
          description: data.errors?.[0]?.message || "未知错误",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Load tunnels error:", error);
      toast({
        title: "加载失败",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCertificates = async () => {
    const email = getCookie("cf_email") || cfEmail;
    const apiKey = getCookie("cf_api_key") || cfApiKey;
    if (!email || !apiKey || !selectedZone) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cloudflare-api", {
        body: {
          action: "list_certificates",
          email,
          apiKey,
          zoneId: selectedZone,
        },
      });

      if (error) throw error;

      if (data.success) {
        setCertificates(Array.isArray(data.result) ? data.result : []);
      } else {
        // 检查是否是账户级别限制
        const errorMsg = data.errors?.[0]?.message || "";
        if (errorMsg.includes("Plan level") || errorMsg.includes("custom certificates")) {
          // 免费版账户，不显示错误
          setCertificates([]);
        } else {
          toast({
            title: "加载证书失败",
            description: errorMsg || "未知错误",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Load certificates error:", error);
      // 静默处理，不显示错误提示
      setCertificates([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPagesProjects = async () => {
    const email = getCookie("cf_email") || cfEmail;
    const apiKey = getCookie("cf_api_key") || cfApiKey;
    if (!email || !apiKey || zones.length === 0) return;

    const accountId = zones[0]?.account?.id;
    if (!accountId) return;

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

      if (data.success) {
        setPagesProjects(data.result || []);
      } else {
        toast({
          title: "加载 Pages 项目失败",
          description: data.errors?.[0]?.message || "未知错误",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Load pages projects error:", error);
      toast({
        title: "加载失败",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPages(false);
    }
  };

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

  const verifyAndSaveCredentials = async (email?: string, apiKey?: string) => {
    const useEmail = email || cfEmail;
    const useApiKey = apiKey || cfApiKey;

    if (!useEmail || !useApiKey) {
      toast({
        title: "请输入完整凭据",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      // 使用外部 Worker API 进行验证（通过 supabase-adapter）
      const { data, error } = await supabase.functions.invoke("verify-cloudflare", {
        body: {
          email: useEmail,
          apiKey: useApiKey,
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

      // 保存到多账号系统
      const account = saveAccount(useEmail, useApiKey);
      setCurrentAccount(account.id);
      setCurrentAccountId(account.id);

      // 更新状态
      setSavedAccounts(getAllAccounts());
      setCloudflareCredentials(useEmail, useApiKey);
      setHasCredentials(true);
      setCfEmail(useEmail);
      setCfApiKey(useApiKey);

      toast({
        title: "凭据验证成功",
        description: "正在加载数据...",
      });

      await loadZones({ email: useEmail, apiKey: useApiKey });
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

    // 清空当前选择的域名与相关数据，避免显示上一个账号的数据
    setSelectedZone("");
    setSelectedZoneName("");
    setDnsRecords([]);
    setWorkerRoutes([]);
    setWorkers([]);
    setSelectedWorker("");
    setWorkerDetail(null);

    // 更新账号信息
    setCurrentAccount(accountId);
    setCurrentAccountId(accountId);
    setCfEmail(account.email);
    setCfApiKey(account.apiKey);
    setCloudflareCredentials(account.email, account.apiKey);

    // 回到域名管理视图（等同用户点击“域名管理”）
    setActiveView("zones");

    // 刷新域名列表（使用新账号凭据）
    toast({
      title: "账号已切换",
      description: `正在加载 ${account.email} 的数据...`,
    });

    await loadZones({ email: account.email, apiKey: account.apiKey });
  };

  // 删除账号
  const handleDeleteAccount = (accountId: string) => {
    const account = savedAccounts.find((acc) => acc.id === accountId);
    if (!account) return;

    if (!confirm(`确定要删除账号 ${account.email} 吗？`)) return;

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
        description: `${account.email} 已从列表中移除`,
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

  const loadZones = async (override?: { email: string; apiKey: string }) => {
    const email = override?.email ?? (cfEmail || getCookie("cf_email"));
    const apiKey = override?.apiKey ?? (cfApiKey || getCookie("cf_api_key"));
    if (!email || !apiKey) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cloudflare-api", {
        body: {
          action: "list_zones",
          email,
          apiKey,
        },
      });

      if (error) throw error;

      if (data.success) {
        setZones(data.result || []);
      } else {
        toast({
          title: "加载域名失败",
          description: data.errors?.[0]?.message || "未知错误",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Load zones error:", error);
      toast({
        title: "加载失败",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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

  const loadDNSRecords = async (zoneId: string) => {
    const email = cfEmail || getCookie("cf_email");
    const apiKey = cfApiKey || getCookie("cf_api_key");
    if (!email || !apiKey) return;

    setIsLoading(true);
    try {
      // 加载DNS记录
      const { data, error } = await supabase.functions.invoke("cloudflare-api", {
        body: {
          action: "list_dns_records",
          email,
          apiKey,
          zoneId,
        },
      });

      if (error) throw error;

      if (data.success) {
        setDnsRecords(data.result || []);
      }

      // 加载Worker路由
      const { data: routesData, error: routesError } = await supabase.functions.invoke("cloudflare-api", {
        body: {
          action: "list_worker_routes",
          email,
          apiKey,
          zoneId,
        },
      });

      if (!routesError && routesData?.success) {
        setWorkerRoutes(routesData.result || []);
      }
    } catch (error) {
      console.error("Load DNS records error:", error);
    } finally {
      setIsLoading(false);
    }
  };

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
    } catch (error: any) {
      console.error("Update always online error:", error);
      toast({
        title: "更新失败",
        description: error.message,
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

  const toggleFirewallRule = async (rule: any) => {
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

  const loadWorkers = async () => {
    const email = getCookie("cf_email") || cfEmail;
    const apiKey = getCookie("cf_api_key") || cfApiKey;
    if (!email || !apiKey) return;

    setIsLoading(true);
    try {
      let accountId = zones[0]?.account?.id;

      if (!accountId) {
        const { data: zonesData, error: zonesError } = await supabase.functions.invoke("cloudflare-api", {
          body: {
            action: "list_zones",
            email,
            apiKey,
          },
        });

        if (zonesError) throw zonesError;

        if (zonesData.success && zonesData.result?.length > 0) {
          accountId = zonesData.result[0]?.account?.id;
          setZones(zonesData.result);
        }
      }

      if (!accountId) {
        toast({
          title: "无法获取账户信息",
          description: "请先在 Cloudflare 中添加域名",
          variant: "destructive",
        });
        return;
      }

      // 获取 workers.dev subdomain
      const { data: subdomainData, error: subdomainError } = await supabase.functions.invoke("cloudflare-api", {
        body: {
          action: "get_workers_subdomain",
          email,
          apiKey,
          accountId: accountId,
        },
      });

      if (!subdomainError && subdomainData.success && subdomainData.result?.subdomain) {
        const subdomain = subdomainData.result.subdomain;
        setWorkerSubdomain(subdomain);
        setCookie("cf_worker_subdomain", subdomain, 30); // 保存到 cookie
      } else if (!workerSubdomain) {
        // 如果 API 调用失败且没有缓存，使用 accountId 前8位作为占位符
        setWorkerSubdomain(accountId.slice(0, 8));
      }

      const { data, error } = await supabase.functions.invoke("cloudflare-api", {
        body: {
          action: "list_workers",
          email,
          apiKey,
          accountId: accountId,
        },
      });

      if (error) throw error;

      if (data.success) {
        const workersList = data.result || [];
        setWorkers(workersList);

        // 为每个 Worker 加载 bindings
        if (accountId && workersList.length > 0) {
          // 先加载 D1 数据库和 KV 命名空间列表
          const [d1Response, kvResponse] = await Promise.all([
            supabase.functions.invoke("cloudflare-api", {
              body: { action: "list_d1_databases", email, apiKey, accountId },
            }),
            supabase.functions.invoke("cloudflare-api", {
              body: { action: "list_kv_namespaces", email, apiKey, accountId },
            }),
          ]);

          // 创建ID到名称的映射
          const d1Map: Record<string, string> = {};
          const kvMap: Record<string, string> = {};

          if (!d1Response.error && d1Response.data.success) {
            (d1Response.data.result || []).forEach((db: D1DatabaseSummary) => {
              d1Map[db.uuid] = db.name;
            });
          }

          if (!kvResponse.error && kvResponse.data.success) {
            (kvResponse.data.result || []).forEach((ns: KVNamespaceSummary) => {
              kvMap[ns.id] = ns.title;
            });
          }

          const bindingsMap: Record<string, WorkerBinding[]> = {};
          await Promise.all(
            workersList.map(async (worker: Worker) => {
              try {
                const { data: bindingsData, error: bindingsError } = await supabase.functions.invoke("cloudflare-api", {
                  body: {
                    action: "get_worker_bindings",
                    email,
                    apiKey,
                    accountId,
                    scriptName: worker.id,
                  },
                });

                if (!bindingsError && bindingsData.success) {
                  // Cloudflare API 返回的是数组，不是嵌套的对象
                  let bindings = Array.isArray(bindingsData.result)
                    ? bindingsData.result
                    : bindingsData.result?.bindings || [];

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
        }
      } else {
        toast({
          title: "加载 Workers 失败",
          description: data.error || "未知错误",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Load workers error:", error);
      toast({
        title: "加载失败",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAnalytics = async (zoneId: string, period: AnalyticsPeriod = analyticsPeriod) => {
    const email = getCookie("cf_email") || cfEmail;
    const apiKey = getCookie("cf_api_key") || cfApiKey;
    if (!email || !apiKey) return;

    setIsLoading(true);
    try {
      // 计算日期范围
      const now = new Date();
      let since = new Date();

      switch (period) {
        case "24h":
          since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "7d":
          since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      const { data, error } = await supabase.functions.invoke("cloudflare-api", {
        body: {
          action: "get_analytics",
          email,
          apiKey,
          zoneId,
          data: {
            since: since.toISOString(),
            until: now.toISOString(),
          },
        },
      });

      if (error) throw error;

      if (data.success) {
        setAnalyticsData(data.result);
        toast({
          title: "数据加载成功",
          description: "分析数据已更新",
        });
        console.log("Analytics data:", data.result);
      } else {
        const errorMsg = data.errors?.[0]?.message || "未知错误";
        toast({
          title: "加载失败",
          description: errorMsg,
          variant: "destructive",
          action: errorMsg ? (
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
          ) : undefined,
        });
      }
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
  };

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

      const matchedZone = zonesData.result.find((zone: any) => domainName.endsWith(zone.name));

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
      const workerNotFound = data?.errors?.some((e: any) => e.code === 10007);

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
                连接您的 Cloudflare 账号
              </h2>
              <p className="text-muted-foreground">
                {savedAccounts.length > 0 ? "选择已保存的账号或添加新账号" : "输入凭据后即可管理和使用强大的Cloudflare"}
              </p>
            </div>

            {/* 已保存的账号列表 */}
            {savedAccounts.length > 0 && (
              <div className="mb-6">
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="text-sm">已保存的账号</CardTitle>
                    <CardDescription className="text-xs">点击账号快速登录</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {savedAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between p-3 border border-border/50 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
                        onClick={() => {
                          verifyAndSaveCredentials(account.email, account.apiKey);
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{account.email}</div>
                          {account.nickname && (
                            <div className="text-xs text-muted-foreground truncate">{account.nickname}</div>
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
                            if (confirm(`确定要删除账号 ${account.email} 吗？`)) {
                              deleteAccount(account.id);
                              setSavedAccounts(getAllAccounts());
                              toast({
                                title: "账号已删除",
                                description: `${account.email} 已从列表中移除`,
                              });
                            }
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
                  {savedAccounts.length > 0 ? "添加新账号" : "Cloudflare 凭据"}
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
                      <Label htmlFor="cfEmail">Cloudflare 账号邮箱</Label>
                      <Input
                        id="cfEmail"
                        name="cfEmail"
                        type="email"
                        autoComplete="off"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        value={cfEmail}
                        onChange={(e) => setCfEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cfApiKey">Cloudflare API 密钥</Label>
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
                        placeholder="您的 API 密钥"
                        className="mt-1.5"
                      />
                      <p className="text-xs text-muted-foreground mt-1.5">
                        点击右上角头像→ 配置文件→ API 令牌→ 下拉到API 密钥→ 查看或创建Global API Key
                      </p>
                    </div>
                    <Button
                      type="submit"
                      disabled={isVerifying}
                      className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-glow"
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          验证中...
                        </>
                      ) : (
                        "验证并进入管理后台"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* 注册 Cloudflare 账号提示 */}
            <div className="mt-6 text-center">
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
            </div>
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
                        <p className="text-xs text-muted-foreground truncate">{cfEmail}</p>
                        <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[280px] bg-background border-border z-50">
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">已保存的账号</div>
                      {savedAccounts.map((account) => (
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
                              <div className="text-sm font-medium truncate">{account.email}</div>
                              {account.nickname && (
                                <div className="text-xs text-muted-foreground truncate">{account.nickname}</div>
                              )}
                            </div>
                          </div>
                          {savedAccounts.length > 1 && (
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
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => {
                        setActiveView("zones");
                        loadZones();
                      }}
                      isActive={activeView === "zones"}
                    >
                      <Globe className="w-4 h-4" />
                      <span>域名管理</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setActiveView("deploy")} isActive={activeView === "deploy"}>
                      <Zap className="w-4 h-4" />
                      <span>一键加速</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
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
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setActiveView("operation-history")}
                      isActive={activeView === "operation-history"}
                    >
                      <History className="w-4 h-4" />
                      <span>操作历史</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {showWorkers && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => {
                          setActiveView("workers");
                          loadWorkers();
                        }}
                        isActive={activeView === "workers"}
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        <span>Workers</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setActiveView("pages")} isActive={activeView === "pages"}>
                      <FileText className="w-4 h-4" />
                      <span>Pages</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => {
                        setActiveView("d1-database");
                        loadD1Databases();
                      }}
                      isActive={activeView === "d1-database"}
                    >
                      <Database className="w-4 h-4" />
                      <span>D1 数据库</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => {
                        setActiveView("r2-storage");
                        loadR2Buckets();
                      }}
                      isActive={activeView === "r2-storage"}
                    >
                      <HardDrive className="w-4 h-4" />
                      <span>R2 存储桶</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setActiveView("kv-storage")}
                      isActive={activeView === "kv-storage"}
                    >
                      <Key className="w-4 h-4" />
                      <span>Workers KV</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setActiveView("worker-templates")}
                      isActive={activeView === "worker-templates"}
                    >
                      <Code2 className="w-4 h-4" />
                      <span>Worker 模板库</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => {
                        setActiveView("tunnels");
                        loadTunnels();
                      }}
                      isActive={activeView === "tunnels"}
                    >
                      <Network className="w-4 h-4" />
                      <span>Cloudflare Tunnels</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
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
            {isAdmin && (
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
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => {
                          setActiveView("dns");
                          loadDNSRecords(selectedZone);
                          setDnsNavClicks((c) => c + 1);
                        }}
                        isActive={activeView === "dns"}
                      >
                        <Database className="w-4 h-4" />
                        <span>DNS 记录</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
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
                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={() => setActiveView("cache")} isActive={activeView === "cache"}>
                        <Database className="w-4 h-4" />
                        <span>缓存管理</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
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
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => {
                          setActiveView("analytics");
                          loadAnalytics(selectedZone);
                        }}
                        isActive={activeView === "analytics"}
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        <span>统计分析</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveView("page-rules")}
                        isActive={activeView === "page-rules"}
                      >
                        <Settings className="w-4 h-4" />
                        <span>页面规则</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => {
                          setActiveView("certificates");
                          if (selectedZone) loadCertificates();
                        }}
                        isActive={activeView === "certificates"}
                      >
                        <Shield className="w-4 h-4" />
                        <span>证书管理</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
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
                  {activeView === "kv-storage" && "Workers KV 管理"}
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
                      {savedAccounts.length > 1 && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            // 切换到下一个账号
                            const currentIndex = savedAccounts.findIndex((acc) => acc.id === currentAccountId);
                            const nextIndex = (currentIndex + 1) % savedAccounts.length;
                            const nextAccount = savedAccounts[nextIndex];
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
                <AddZoneForm onSuccess={loadZones} />

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
                        未找到域名，请在 Cloudflare 中添加域名
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
                            <div className="text-xs font-semibold text-muted-foreground pr-[8px]">计划</div>
                            <div className="w-[52px] ml-10"></div>
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
                                </div>
                              </div>
                              {zone.status === "pending" && zone.name_servers && (
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

                <AddDNSRecordForm
                  key={`${selectedZone}-${dnsNavClicks}`}
                  zoneId={selectedZone}
                  onSuccess={() => loadDNSRecords(selectedZone)}
                  cfEmail={cfEmail}
                  cfApiKey={cfApiKey}
                />

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
                          <div className="flex gap-2 flex-shrink-0" style={{ width: "104px" }}>
                            {/* 占位符，与按钮宽度对齐 */}
                          </div>
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

                {editingRecord && (
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
              <div className="max-w-4xl mx-auto space-y-4">
                {/* Worker 使用分析面板 */}
                {zones.length > 0 && zones[0]?.account?.id && (
                  <WorkerAnalyticsPanel accountId={zones[0].account.id} email={cfEmail} apiKey={cfApiKey} />
                )}

                <Card className="shadow-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <LayoutDashboard className="w-5 h-5" />
                          Workers 列表
                        </CardTitle>
                        <CardDescription>查看和管理您的 Cloudflare Workers</CardDescription>
                      </div>
                      <Button onClick={() => setCreateWorkerOpen(true)} disabled={isLoading}>
                        新建 Worker
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : workers.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">暂无 Workers</p>
                    ) : (
                      <div className="space-y-2">
                        {[...workers]
                          .sort((a, b) => {
                            // 按修改日期排序，最新的在前
                            const dateA = new Date(a.modified_on || a.created_on || 0);
                            const dateB = new Date(b.modified_on || b.created_on || 0);
                            return dateB.getTime() - dateA.getTime();
                          })
                          .map((worker) => (
                            <div
                              key={worker.id}
                              className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer"
                              onClick={() => {
                                setEditingWorker({ id: worker.id, name: worker.id });
                                setEditWorkerOpen(true);
                                if (zones.length > 0 && zones[0]?.account?.id) {
                                  loadWorkerBindings(worker.id, zones[0].account.id);
                                }
                              }}
                            >
                              <div className="flex-1">
                                <h3 className="font-semibold">{worker.id}</h3>
                                <div className="flex flex-col gap-1.5 mt-1">
                                  {/* Workers.dev 域名 + 绑定资源 */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <a
                                      href={`https://${worker.id}.${workerSubdomain}.workers.dev`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-xs text-primary hover:underline"
                                    >
                                      https://{worker.id}.{workerSubdomain}.workers.dev
                                    </a>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const url = `https://${worker.id}.${workerSubdomain}.workers.dev`;
                                        navigator.clipboard.writeText(url);
                                        toast({
                                          description: "链接已复制到剪贴板",
                                        });
                                      }}
                                    >
                                      <Copy className="w-3 h-3" />
                                    </Button>

                                    {/* 显示 D1、KV 和 R2 绑定 */}
                                    {allWorkerBindings[worker.id] && allWorkerBindings[worker.id].length > 0 && (
                                      <>
                                        {allWorkerBindings[worker.id]
                                          .filter((b) => b.type === "d1")
                                          .map((binding, idx) => (
                                            <span
                                              key={`d1-${idx}`}
                                              className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs rounded flex items-center gap-1"
                                              title={`D1 Database: ${binding.realName || binding.name}`}
                                            >
                                              <Database className="w-3 h-3" />
                                              D1:{binding.realName || binding.name}
                                            </span>
                                          ))}
                                        {allWorkerBindings[worker.id]
                                          .filter((b) => b.type === "kv_namespace")
                                          .map((binding, idx) => (
                                            <span
                                              key={`kv-${idx}`}
                                              className="px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs rounded flex items-center gap-1"
                                              title={`KV Namespace: ${binding.realName || binding.name}`}
                                            >
                                              <Key className="w-3 h-3" />
                                              KV:{binding.realName || binding.name}
                                            </span>
                                          ))}
                                        {allWorkerBindings[worker.id]
                                          .filter((b) => b.type === "r2_bucket")
                                          .map((binding, idx) => (
                                            <span
                                              key={`r2-${idx}`}
                                              className="px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 text-xs rounded flex items-center gap-1"
                                              title={`R2 Bucket: ${binding.bucket_name || binding.name}`}
                                            >
                                              <HardDrive className="w-3 h-3" />
                                              R2:{binding.bucket_name || binding.name}
                                            </span>
                                          ))}
                                      </>
                                    )}
                                  </div>

                                  {/* 自定义域名（来自 routes） */}
                                  {worker.routes && worker.routes.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-2">
                                      {worker.routes.slice(0, 3).map((route: any, idx: number) => {
                                        // 提取域名部分
                                        const pattern = route.pattern || "";
                                        const domain = pattern.replace(/\/\*$/, "").replace(/^https?:\/\//, "");

                                        return (
                                          <div key={idx} className="flex items-center gap-1">
                                            <Globe className="w-3 h-3 text-muted-foreground" />
                                            <a
                                              href={
                                                pattern.startsWith("http")
                                                  ? pattern.replace("/*", "")
                                                  : `https://${domain}`
                                              }
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              onClick={(e) => e.stopPropagation()}
                                              className="text-xs text-muted-foreground hover:text-primary transition-colors"
                                            >
                                              {domain}
                                            </a>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-5 w-5 p-0"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const url = pattern.startsWith("http")
                                                  ? pattern.replace("/*", "")
                                                  : `https://${domain}`;
                                                navigator.clipboard.writeText(url);
                                                toast({
                                                  description: "自定义域名已复制",
                                                });
                                              }}
                                            >
                                              <Copy className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        );
                                      })}
                                      {worker.routes.length > 3 && (
                                        <span className="text-xs text-muted-foreground">
                                          +{worker.routes.length - 3} 更多
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  创建时间: {new Date(worker.created_on).toLocaleString("zh-CN")}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="outline" title="绑定资源">
                                      <Database className="w-4 h-4 mr-1" />
                                      绑定
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setWorkerForD1Binding({ id: worker.id, name: worker.id });
                                        setBindD1Open(true);
                                      }}
                                    >
                                      <Database className="w-4 h-4 mr-2" />
                                      D1 数据库
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setWorkerForR2Binding({ id: worker.id, name: worker.id });
                                        setBindR2Open(true);
                                      }}
                                    >
                                      <HardDrive className="w-4 h-4 mr-2" />
                                      R2 存储桶
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setWorkerForKVBinding({ id: worker.id, name: worker.id });
                                        setBindKVOpen(true);
                                      }}
                                    >
                                      <Key className="w-4 h-4 mr-2" />
                                      KV 命名空间
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setWorkerForVariables({ id: worker.id, name: worker.id });
                                    setManageVariablesOpen(true);
                                  }}
                                  title="管理环境变量"
                                >
                                  <Settings className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingWorker({ id: worker.id, name: worker.id });
                                    setEditWorkerOpen(true);
                                    if (zones.length > 0 && zones[0]?.account?.id) {
                                      loadWorkerBindings(worker.id, zones[0].account.id);
                                    }
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteWorker(worker.id, worker.id);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
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

            {activeView === "page-rules" && selectedZone && (
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
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Settings className="w-5 h-5" />
                      页面规则管理
                    </CardTitle>
                    <CardDescription>当前域名: {selectedZoneName}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* 创建/编辑规则表单 */}
                      <div className="p-3 border border-border/50 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-medium text-sm">{editingPageRuleId ? "编辑页面规则" : "创建页面规则"}</h3>
                          {editingPageRuleId && (
                            <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded">编辑模式</span>
                          )}
                        </div>

                        {/* 互斥规则提示 */}
                        {(newPageRule.forwardingType || newPageRule.alwaysUseHttps === "on") && (
                          <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-600 dark:text-yellow-400">
                            ⚠️ 注意：URL转发 和 始终HTTPS 不能与其他设置同时使用
                          </div>
                        )}

                        {/* URL 和状态 */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                          <div className="md:col-span-2">
                            <Label className="text-xs mb-1 block">URL 模式 *</Label>
                            <Input
                              placeholder="*.example.com/images/*"
                              value={newPageRule.urlPattern}
                              onChange={(e) => setNewPageRule({ ...newPageRule, urlPattern: e.target.value })}
                              className="h-9 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs mb-1 block">规则状态</Label>
                            <select
                              className="w-full h-9 px-2 text-sm border border-border/50 rounded-md bg-background"
                              value={newPageRule.status}
                              onChange={(e) =>
                                setNewPageRule({ ...newPageRule, status: e.target.value as "active" | "disabled" })
                              }
                            >
                              <option value="active">启用</option>
                              <option value="disabled">禁用</option>
                            </select>
                          </div>
                        </div>

                        {/* 缓存和安全设置 */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                          <div>
                            <Label className="text-xs mb-1 block">缓存级别</Label>
                            <select
                              className="w-full h-9 px-2 text-sm border border-border/50 rounded-md bg-background"
                              value={newPageRule.cacheLevel}
                              onChange={(e) => setNewPageRule({ ...newPageRule, cacheLevel: e.target.value })}
                              disabled={!!newPageRule.forwardingType || newPageRule.alwaysUseHttps === "on"}
                            >
                              <option value="">不设置</option>
                              <option value="bypass">绕过</option>
                              <option value="basic">无查询字符串</option>
                              <option value="simplified">忽略查询字符串</option>
                              <option value="aggressive">标准</option>
                              <option value="cache_everything">全部缓存</option>
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs mb-1 block">浏览器缓存</Label>
                            <select
                              className="w-full h-9 px-2 text-sm border border-border/50 rounded-md bg-background"
                              value={newPageRule.browserCacheTtl}
                              onChange={(e) => setNewPageRule({ ...newPageRule, browserCacheTtl: e.target.value })}
                              disabled={!!newPageRule.forwardingType || newPageRule.alwaysUseHttps === "on"}
                            >
                              <option value="">不设置</option>
                              <option value="3600">1小时</option>
                              <option value="14400">4小时</option>
                              <option value="86400">1天</option>
                              <option value="604800">1周</option>
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs mb-1 block">安全级别</Label>
                            <select
                              className="w-full h-9 px-2 text-sm border border-border/50 rounded-md bg-background"
                              value={newPageRule.securityLevel}
                              onChange={(e) => setNewPageRule({ ...newPageRule, securityLevel: e.target.value })}
                              disabled={!!newPageRule.forwardingType || newPageRule.alwaysUseHttps === "on"}
                            >
                              <option value="">不设置</option>
                              <option value="off">关闭</option>
                              <option value="low">低</option>
                              <option value="medium">中</option>
                              <option value="high">高</option>
                            </select>
                          </div>
                        </div>

                        {/* SSL 和 HTTPS 设置 */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                          <div>
                            <Label className="text-xs mb-1 block">SSL 模式</Label>
                            <select
                              className="w-full h-9 px-2 text-sm border border-border/50 rounded-md bg-background"
                              value={newPageRule.ssl}
                              onChange={(e) => setNewPageRule({ ...newPageRule, ssl: e.target.value })}
                              disabled={!!newPageRule.forwardingType || newPageRule.alwaysUseHttps === "on"}
                            >
                              <option value="">不设置</option>
                              <option value="off">关闭</option>
                              <option value="flexible">灵活</option>
                              <option value="full">完全</option>
                              <option value="strict">严格</option>
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs mb-1 block">始终 HTTPS</Label>
                            <select
                              className="w-full h-9 px-2 text-sm border border-border/50 rounded-md bg-background"
                              value={newPageRule.alwaysUseHttps}
                              onChange={(e) => {
                                const value = e.target.value;
                                setNewPageRule({
                                  ...newPageRule,
                                  alwaysUseHttps: value,
                                  // 如果选择了 always_use_https，清空其他设置
                                  ...(value === "on"
                                    ? {
                                        cacheLevel: "",
                                        browserCacheTtl: "",
                                        securityLevel: "",
                                        ssl: "",
                                      }
                                    : {}),
                                });
                              }}
                              disabled={!!newPageRule.forwardingType}
                            >
                              <option value="">不设置</option>
                              <option value="on">开启</option>
                              <option value="off">关闭</option>
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs mb-1 block">转发类型</Label>
                            <select
                              className="w-full h-9 px-2 text-sm border border-border/50 rounded-md bg-background"
                              value={newPageRule.forwardingType}
                              onChange={(e) => {
                                const value = e.target.value;
                                setNewPageRule({
                                  ...newPageRule,
                                  forwardingType: value,
                                  // 如果选择了转发，清空其他设置
                                  ...(value
                                    ? {
                                        cacheLevel: "",
                                        browserCacheTtl: "",
                                        securityLevel: "",
                                        ssl: "",
                                        alwaysUseHttps: "",
                                      }
                                    : {}),
                                });
                              }}
                              disabled={newPageRule.alwaysUseHttps === "on"}
                            >
                              <option value="">不设置</option>
                              <option value="301">301 永久</option>
                              <option value="302">302 临时</option>
                            </select>
                          </div>
                        </div>

                        {/* 转发 URL */}
                        {newPageRule.forwardingType && (
                          <div className="mb-3">
                            <Label className="text-xs mb-1 block">目标 URL</Label>
                            <Input
                              placeholder="https://example.com/new-path"
                              value={newPageRule.forwardingUrl}
                              onChange={(e) => setNewPageRule({ ...newPageRule, forwardingUrl: e.target.value })}
                              className="h-9 text-sm"
                            />
                          </div>
                        )}

                        {/* 按钮 */}
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setNewPageRule({
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
                              setEditingPageRuleId(null);
                            }}
                            disabled={isLoading}
                          >
                            {editingPageRuleId ? "取消" : "重置"}
                          </Button>
                          <Button size="sm" onClick={createOrUpdatePageRule} disabled={isLoading}>
                            {isLoading ? (
                              <>
                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                {editingPageRuleId ? "更新中" : "创建中"}
                              </>
                            ) : editingPageRuleId ? (
                              "更新规则"
                            ) : (
                              "创建规则"
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* 现有规则列表 */}
                      <div className="p-3 border border-border/50 rounded-lg">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-medium text-sm">现有规则</h3>
                          <Button variant="outline" size="sm" onClick={loadPageRules} disabled={isLoading}>
                            {isLoading ? (
                              <>
                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                加载中
                              </>
                            ) : (
                              "刷新"
                            )}
                          </Button>
                        </div>
                        {pageRules.length === 0 ? (
                          <div className="text-xs text-muted-foreground text-center py-3">暂无页面规则</div>
                        ) : (
                          <div className="space-y-2">
                            {pageRules.map((rule: any) => (
                              <div
                                key={rule.id}
                                className="p-3 border border-border/50 rounded-lg hover:bg-accent/5 transition-colors"
                              >
                                <div className="flex justify-between items-center gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Switch
                                        checked={rule.status === "active"}
                                        onCheckedChange={async (checked) => {
                                          const email = getCookie("cf_email") || cfEmail;
                                          const apiKey = getCookie("cf_api_key") || cfApiKey;
                                          if (!email || !apiKey) {
                                            toast({ title: "请先配置 Cloudflare 凭证", variant: "destructive" });
                                            return;
                                          }

                                          setIsLoading(true);
                                          try {
                                            // 发送完整的规则数据，只修改 status
                                            const { data, error } = await supabase.functions.invoke("cloudflare-api", {
                                              body: {
                                                action: "update_page_rule",
                                                email,
                                                apiKey,
                                                zoneId: selectedZone,
                                                pageRuleId: rule.id,
                                                ruleData: {
                                                  targets: rule.targets,
                                                  actions: rule.actions,
                                                  priority: rule.priority,
                                                  status: checked ? "active" : "disabled",
                                                },
                                              },
                                            });

                                            if (error) throw error;

                                            if (data.success) {
                                              toast({
                                                title: checked ? "规则已启用" : "规则已禁用",
                                              });
                                              await loadPageRules();
                                            } else {
                                              toast({
                                                title: "更新失败",
                                                description: data.errors?.[0]?.message || "未知错误",
                                                variant: "destructive",
                                              });
                                            }
                                          } catch (error) {
                                            console.error("Toggle page rule error:", error);
                                            toast({
                                              title: "更新失败",
                                              variant: "destructive",
                                            });
                                          } finally {
                                            setIsLoading(false);
                                          }
                                        }}
                                        disabled={isLoading}
                                      />
                                      <span
                                        className={`text-xs font-medium ${
                                          rule.status === "active" ? "text-green-500" : "text-gray-500"
                                        }`}
                                      >
                                        {rule.status === "active" ? "启用" : "禁用"}
                                      </span>
                                      <span className="text-xs text-muted-foreground">P{rule.priority}</span>
                                    </div>
                                    <p className="text-xs font-medium mb-1 truncate">
                                      {rule.targets?.[0]?.constraint?.value || "未设置"}
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {rule.actions?.map((action: any, idx: number) => (
                                        <span
                                          key={`${action.id}-${idx}`}
                                          className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded"
                                        >
                                          {action.id === "forwarding_url" && typeof action.value === "object"
                                            ? `${action.value.status_code} → ${action.value.url}`
                                            : action.id === "always_use_https"
                                              ? "Always HTTPS"
                                              : typeof action.value === "object"
                                                ? JSON.stringify(action.value)
                                                : `${action.id.replace(/_/g, " ")}: ${action.value}`}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex gap-1 flex-shrink-0">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => {
                                        const urlPattern = rule.targets?.[0]?.constraint?.value || "";
                                        const formData: any = {
                                          urlPattern,
                                          cacheLevel: "",
                                          browserCacheTtl: "",
                                          securityLevel: "",
                                          ssl: "",
                                          alwaysUseHttps: "",
                                          forwardingType: "",
                                          forwardingUrl: "",
                                          status: rule.status,
                                        };

                                        rule.actions?.forEach((action: any) => {
                                          if (action.id === "cache_level") {
                                            formData.cacheLevel = action.value;
                                          } else if (action.id === "browser_cache_ttl") {
                                            formData.browserCacheTtl = action.value.toString();
                                          } else if (action.id === "security_level") {
                                            formData.securityLevel = action.value;
                                          } else if (action.id === "ssl") {
                                            formData.ssl = action.value;
                                          } else if (action.id === "always_use_https") {
                                            formData.alwaysUseHttps = action.value;
                                          } else if (action.id === "forwarding_url") {
                                            formData.forwardingType = action.value.status_code.toString();
                                            formData.forwardingUrl = action.value.url;
                                          }
                                        });

                                        setNewPageRule(formData);
                                        setEditingPageRuleId(rule.id);
                                        window.scrollTo({ top: 0, behavior: "smooth" });

                                        toast({
                                          title: "编辑模式",
                                          description: "表单已填充数据",
                                        });
                                      }}
                                      disabled={isLoading}
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={async () => {
                                        const email = getCookie("cf_email") || cfEmail;
                                        const apiKey = getCookie("cf_api_key") || cfApiKey;
                                        if (!email || !apiKey) {
                                          toast({
                                            title: "请先配置 Cloudflare 凭证",
                                            variant: "destructive",
                                          });
                                          return;
                                        }

                                        if (!confirm(`确定删除这条规则吗？\n${rule.targets?.[0]?.constraint?.value}`))
                                          return;

                                        setIsLoading(true);
                                        try {
                                          console.log("Deleting page rule:", {
                                            ruleId: rule.id,
                                            zoneId: selectedZone,
                                            email,
                                            hasApiKey: !!apiKey,
                                          });

                                          const { data, error } = await supabase.functions.invoke("cloudflare-api", {
                                            body: {
                                              action: "delete_page_rule",
                                              email,
                                              apiKey,
                                              zoneId: selectedZone,
                                              pageRuleId: rule.id,
                                            },
                                          });

                                          console.log("Delete page rule response:", { data, error });

                                          if (error) {
                                            console.error("API error:", error);
                                            throw error;
                                          }

                                          if (data?.success) {
                                            toast({
                                              title: "删除成功",
                                            });
                                            await loadPageRules();
                                          } else {
                                            const errorMsg = data?.errors?.[0]?.message || data?.error || "未知错误";
                                            console.error("Delete failed:", data);
                                            toast({
                                              title: "删除失败",
                                              description: errorMsg,
                                              variant: "destructive",
                                            });
                                          }
                                        } catch (error) {
                                          console.error("Delete page rule error:", error);
                                          toast({
                                            title: "删除失败",
                                            description: error.message || "请求失败",
                                            variant: "destructive",
                                          });
                                        } finally {
                                          setIsLoading(false);
                                        }
                                      }}
                                      disabled={isLoading}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
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
                  <>
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
                          自定义证书管理
                        </CardTitle>
                        <CardDescription>当前域名: {selectedZoneName}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {/* 上传自定义证书 */}
                          <div className="p-4 border border-border/50 rounded-lg bg-muted/20">
                            <h3 className="font-medium mb-2">上传自定义 SSL 证书</h3>
                            <p className="text-sm text-muted-foreground mb-4">上传您自己的 SSL/TLS 证书和私钥</p>
                            <div className="space-y-3">
                              <div>
                                <Label className="text-sm mb-2 block">证书（Certificate）</Label>
                                <textarea
                                  id="custom-cert"
                                  placeholder="-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----"
                                  className="w-full min-h-[120px] p-2 border border-border/50 rounded-md bg-background font-mono text-xs"
                                  disabled
                                />
                              </div>
                              <div>
                                <Label className="text-sm mb-2 block">私钥（Private Key）</Label>
                                <textarea
                                  id="custom-key"
                                  placeholder="-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----"
                                  className="w-full min-h-[120px] p-2 border border-border/50 rounded-md bg-background font-mono text-xs"
                                  disabled
                                />
                              </div>
                              <div>
                                <Label className="text-sm mb-2 block">证书链（可选）</Label>
                                <textarea
                                  id="custom-bundle"
                                  placeholder="中间证书和根证书（可选）"
                                  className="w-full min-h-[80px] p-2 border border-border/50 rounded-md bg-background font-mono text-xs"
                                  disabled
                                />
                              </div>
                              <Button disabled variant="outline">
                                上传证书
                              </Button>
                              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                  ⚠️ 自定义证书功能需要 Cloudflare 企业版或更高版本账户。
                                  <br />
                                  免费版和 Pro 版账户自动使用 Cloudflare Universal SSL。
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* 证书状态监控 */}
                          <div className="p-4 border border-border/50 rounded-lg">
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="font-medium">证书状态监控</h3>
                              <Button variant="outline" size="sm" onClick={loadCertificates} disabled={isLoading}>
                                {isLoading ? (
                                  <>
                                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                    刷新中...
                                  </>
                                ) : (
                                  "刷新状态"
                                )}
                              </Button>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm p-3 bg-green-500/10 border border-green-500/20 rounded">
                                <span className="text-muted-foreground">Cloudflare Universal SSL</span>
                                <span className="text-green-600 dark:text-green-400 font-medium">● 已激活</span>
                              </div>
                              <div className="p-3 bg-muted/30 rounded text-sm text-muted-foreground">
                                <p className="mb-2">
                                  您的域名已自动启用 Cloudflare Universal SSL，提供免费的 HTTPS 加密。
                                </p>
                                <ul className="list-disc list-inside space-y-1 text-xs">
                                  <li>自动颁发和续期</li>
                                  <li>支持 TLS 1.2 和 TLS 1.3</li>
                                  <li>覆盖主域名和一级子域名</li>
                                </ul>
                              </div>
                              {certificates.length === 0 ? (
                                <div className="text-sm text-muted-foreground text-center py-4 border border-border/50 rounded-lg">
                                  当前账户无自定义证书（需要企业版）
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {certificates.map((cert: any) => (
                                    <div key={cert.id} className="p-3 border border-border/50 rounded-lg">
                                      <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                          <div className="font-medium text-sm">
                                            {cert.hosts?.join(", ") || "Unknown"}
                                          </div>
                                          <div className="text-xs text-muted-foreground mt-1">
                                            到期时间: {new Date(cert.expires_on).toLocaleDateString("zh-CN")}
                                          </div>
                                          <div className="text-xs text-muted-foreground">状态: {cert.status}</div>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={async () => {
                                            if (!confirm("确定要删除此证书吗？")) return;

                                            const email = getCookie("cf_email");
                                            const apiKey = getCookie("cf_api_key");
                                            if (!email || !apiKey) return;

                                            setIsLoading(true);
                                            try {
                                              const { data, error } = await supabase.functions.invoke(
                                                "cloudflare-api",
                                                {
                                                  body: {
                                                    action: "delete_certificate",
                                                    email,
                                                    apiKey,
                                                    zoneId: selectedZone,
                                                    certificateId: cert.id,
                                                  },
                                                },
                                              );

                                              if (error) throw error;

                                              if (data.success) {
                                                toast({
                                                  title: "证书已删除",
                                                });
                                                loadCertificates();
                                              } else {
                                                throw new Error(data.errors?.[0]?.message || "删除失败");
                                              }
                                            } catch (error: any) {
                                              console.error("Delete certificate error:", error);
                                              toast({
                                                title: "删除失败",
                                                description: error.message,
                                                variant: "destructive",
                                              });
                                            } finally {
                                              setIsLoading(false);
                                            }
                                          }}
                                          disabled={isLoading}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 证书到期提醒 */}
                          <div className="p-4 border border-border/50 rounded-lg">
                            <h3 className="font-medium mb-2">证书到期提醒</h3>
                            <p className="text-sm text-muted-foreground mb-4">自动监控证书有效期并在到期前提醒</p>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between p-3 bg-muted/30 rounded">
                                <div>
                                  <div className="text-sm font-medium">提醒时间</div>
                                  <div className="text-xs text-muted-foreground">证书到期前 30 天</div>
                                </div>
                                <Button variant="outline" size="sm">
                                  配置
                                </Button>
                              </div>
                              <div className="flex items-center justify-between p-3 bg-muted/30 rounded">
                                <div>
                                  <div className="text-sm font-medium">通知方式</div>
                                  <div className="text-xs text-muted-foreground">邮件通知</div>
                                </div>
                                <Button variant="outline" size="sm">
                                  修改
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
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
              <div className="max-w-7xl mx-auto space-y-4">
                <Card className="shadow-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div>
                      <CardTitle>D1 SQL 数据库</CardTitle>
                      <CardDescription>管理您的 Cloudflare D1 数据库实例</CardDescription>
                    </div>
                    <Button
                      onClick={() => setShowCreateD1DatabaseForm(true)}
                      disabled={isLoading || zones.length === 0}
                    >
                      <Database className="w-4 h-4 mr-2" />
                      创建数据库
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {d1Databases.length === 0 ? (
                      <div className="text-center py-12">
                        <Database className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">暂无 D1 数据库</p>
                        <p className="text-xs text-muted-foreground mt-2">请前往 Cloudflare 控制台创建 D1 数据库</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {d1Databases.map((db: any) => (
                          <div
                            key={db.uuid}
                            className="p-2 border border-border/50 rounded-lg hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 text-sm">
                                  <h3 className="font-medium truncate">{db.name}</h3>
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {new Date(db.created_at).toLocaleDateString("zh-CN")}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  <span className="truncate">UUID: {db.uuid}</span>
                                  <span className="whitespace-nowrap">版本: {db.version || "N/A"}</span>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  if (!confirm(`确定要删除数据库 ${db.name} 吗？此操作不可撤销！`)) return;

                                  const currentAcc = getCurrentAccount();
                                  const email = getCookie("cf_email") || cfEmail || currentAcc?.email;
                                  const apiKey = getCookie("cf_api_key") || cfApiKey || currentAcc?.apiKey;
                                  if (!email || !apiKey) {
                                    toast({
                                      title: "缺少凭据",
                                      description: "请先在上方输入 Cloudflare 邮箱和 API Key",
                                      variant: "destructive",
                                    });
                                    return;
                                  }

                                  setIsLoading(true);
                                  try {
                                    // 获取 accountId（优先用现有 zones，其次调用 API 获取）
                                    let accountId = zones[0]?.account?.id as string | undefined;
                                    if (!accountId) {
                                      const { data: zonesData, error: zonesErr } = await invokeWorkerApi<any>(
                                        "cloudflare-api",
                                        {
                                          action: "list_zones",
                                          email,
                                          apiKey,
                                        },
                                      );
                                      if (zonesErr) throw zonesErr;
                                      accountId = zonesData?.result?.[0]?.account?.id;
                                    }
                                    if (!accountId) {
                                      toast({
                                        title: "无法确定账号",
                                        description: "未找到可用的 Cloudflare 账号",
                                        variant: "destructive",
                                      });
                                      return;
                                    }

                                    const { data, error } = await invokeWorkerApi<any>("cloudflare-api", {
                                      action: "delete_d1_database",
                                      email,
                                      apiKey,
                                      accountId,
                                      databaseId: db.uuid,
                                    });

                                    if (error) throw error;

                                    if (data?.success) {
                                      toast({
                                        title: "数据库已删除",
                                        description: `${db.name} 已成功删除`,
                                      });
                                      loadD1Databases();
                                    } else {
                                      throw new Error(data?.errors?.[0]?.message || "删除失败");
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
                                }}
                                disabled={isLoading}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* SQL 控制台 */}
                {d1Databases.length > 0 && (
                  <Card className="shadow-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Database className="w-5 h-5" />
                        SQL 控制台
                      </CardTitle>
                      <CardDescription>在选定的数据库中执行 SQL 查询</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="d1-select">选择数据库</Label>
                        <select
                          id="d1-select"
                          className="w-full mt-1.5 px-3 py-2 border border-border rounded-md bg-background"
                          value={selectedD1Database}
                          onChange={(e) => setSelectedD1Database(e.target.value)}
                        >
                          <option value="">-- 选择数据库 --</option>
                          {d1Databases.map((db: any) => (
                            <option key={db.uuid} value={db.uuid}>
                              {db.name} ({db.uuid})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div className="mb-2">
                          <Label htmlFor="d1-sql">SQL 查询</Label>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="text-xs text-muted-foreground">查询:</span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => setD1SqlQuery("SELECT * FROM sqlite_master WHERE type='table';")}
                            >
                              查看表
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                const tableName = prompt("请输入表名:");
                                if (tableName) {
                                  setD1SqlQuery(`SELECT * FROM ${tableName} LIMIT 10;`);
                                }
                              }}
                            >
                              查询数据
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                const tableName = prompt("请输入表名:");
                                if (tableName) {
                                  setD1SqlQuery(`PRAGMA table_info(${tableName});`);
                                }
                              }}
                            >
                              表结构
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                const tableName = prompt("请输入表名:");
                                if (tableName) {
                                  setD1SqlQuery(`SELECT COUNT(*) as total FROM ${tableName};`);
                                }
                              }}
                            >
                              统计记录
                            </Button>
                            <span className="text-xs text-muted-foreground ml-2">操作:</span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                const tableName = prompt("请输入表名:");
                                if (tableName) {
                                  setD1SqlQuery(
                                    `INSERT INTO ${tableName} (column1, column2) VALUES ('value1', 'value2');`,
                                  );
                                }
                              }}
                            >
                              插入数据
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                const tableName = prompt("请输入表名:");
                                if (tableName) {
                                  setD1SqlQuery(`UPDATE ${tableName} SET column1 = 'new_value' WHERE id = 1;`);
                                }
                              }}
                            >
                              更新数据
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                const tableName = prompt("请输入表名:");
                                if (tableName) {
                                  setD1SqlQuery(`DELETE FROM ${tableName} WHERE id = 1;`);
                                }
                              }}
                            >
                              删除数据
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                const tableName = prompt("请输入表名:");
                                if (tableName) {
                                  setD1SqlQuery(
                                    `CREATE TABLE ${tableName} (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  name TEXT NOT NULL,\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);`,
                                  );
                                }
                              }}
                            >
                              创建表
                            </Button>
                          </div>
                        </div>
                        <textarea
                          id="d1-sql"
                          className="w-full mt-1.5 px-3 py-2 border border-border rounded-md bg-background font-mono text-sm min-h-[80px]"
                          value={d1SqlQuery}
                          onChange={(e) => {
                            setD1SqlQuery(e.target.value);
                            setD1HistoryIndex(-1); // 重置历史索引
                          }}
                          onKeyDown={(e) => {
                            // 处理方向键导航历史命令
                            if (e.key === "ArrowUp") {
                              e.preventDefault();
                              if (d1QueryHistory.length > 0) {
                                const newIndex =
                                  d1HistoryIndex < d1QueryHistory.length - 1 ? d1HistoryIndex + 1 : d1HistoryIndex;
                                setD1HistoryIndex(newIndex);
                                setD1SqlQuery(d1QueryHistory[newIndex]);
                              }
                            } else if (e.key === "ArrowDown") {
                              e.preventDefault();
                              if (d1HistoryIndex > 0) {
                                const newIndex = d1HistoryIndex - 1;
                                setD1HistoryIndex(newIndex);
                                setD1SqlQuery(d1QueryHistory[newIndex]);
                              } else if (d1HistoryIndex === 0) {
                                setD1HistoryIndex(-1);
                                setD1SqlQuery("");
                              }
                            }
                          }}
                          placeholder="SELECT * FROM table_name LIMIT 10;"
                        />
                        {d1QueryHistory.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            提示: 使用 ↑↓ 方向键浏览历史命令 ({d1QueryHistory.length} 条)
                          </p>
                        )}
                      </div>

                      <Button
                        onClick={async () => {
                          if (!selectedD1Database) {
                            toast({
                              title: "请选择数据库",
                              variant: "destructive",
                            });
                            return;
                          }

                          if (!d1SqlQuery.trim()) {
                            toast({
                              title: "请输入 SQL 查询",
                              variant: "destructive",
                            });
                            return;
                          }

                          const email = getCookie("cf_email") || cfEmail;
                          const apiKey = getCookie("cf_api_key") || cfApiKey;
                          if (!email || !apiKey) {
                            toast({
                              title: "未找到凭据",
                              description: "请先登录 Cloudflare 账号",
                              variant: "destructive",
                            });
                            return;
                          }

                          if (zones.length === 0) {
                            toast({
                              title: "未找到域名",
                              description: "请先添加 Cloudflare 域名",
                              variant: "destructive",
                            });
                            return;
                          }

                          const accountId = zones[0]?.account?.id;
                          if (!accountId) {
                            toast({
                              title: "未找到账户 ID",
                              description: "无法获取 Cloudflare 账户信息",
                              variant: "destructive",
                            });
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

                            if (data.success) {
                              setD1QueryResult(data.result[0]);

                              // 添加到历史记录（去重，最新的在前）
                              const currentQuery = d1SqlQuery.trim();
                              setD1QueryHistory((prev) => {
                                const filtered = prev.filter((q) => q !== currentQuery);
                                return [currentQuery, ...filtered].slice(0, 50); // 最多保留50条
                              });

                              // 清空查询框
                              setD1SqlQuery("");
                              setD1HistoryIndex(-1);

                              // 不显示成功提示
                            } else {
                              throw new Error(data.errors?.[0]?.message || "查询失败");
                            }
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
                        }}
                        disabled={isExecutingD1Query || !selectedD1Database || !d1SqlQuery.trim()}
                        className="w-full"
                      >
                        {isExecutingD1Query ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            执行中...
                          </>
                        ) : (
                          "执行查询"
                        )}
                      </Button>

                      {/* 查询结果显示 - 固定显示框 */}
                      <div
                        className="border border-border rounded-lg overflow-hidden bg-muted/10"
                        style={{ height: "300px" }}
                      >
                        {d1QueryResult ? (
                          <>
                            <div className="bg-muted px-4 py-2 border-b border-border">
                              <p className="text-sm font-medium">
                                查询结果 ({d1QueryResult.results?.length || 0} 条记录)
                              </p>
                              {d1QueryResult.meta && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  执行时间: {d1QueryResult.meta.duration}ms | 影响行数:{" "}
                                  {d1QueryResult.meta.changes || 0}
                                </p>
                              )}
                            </div>

                            {d1QueryResult.results && d1QueryResult.results.length > 0 ? (
                              <div className="overflow-auto" style={{ height: "calc(300px - 52px)" }}>
                                <table className="w-full text-sm">
                                  <thead className="bg-muted/50 sticky top-0">
                                    <tr>
                                      {Object.keys(d1QueryResult.results[0]).map((column) => (
                                        <th
                                          key={column}
                                          className="px-4 py-2 text-left font-medium border-b border-border"
                                        >
                                          {column}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {d1QueryResult.results.map((row: any, index: number) => (
                                      <tr key={index} className="hover:bg-muted/30 transition-colors">
                                        {Object.values(row).map((value: any, colIndex: number) => (
                                          <td key={colIndex} className="px-4 py-2 border-b border-border/50">
                                            {value === null ? (
                                              <span className="text-muted-foreground italic">null</span>
                                            ) : typeof value === "object" ? (
                                              <code className="text-xs">{JSON.stringify(value)}</code>
                                            ) : (
                                              String(value)
                                            )}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="px-4 py-8 text-center text-muted-foreground">
                                查询执行成功，但没有返回结果
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="h-full flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                              <Database className="w-12 h-12 mx-auto mb-2 opacity-30" />
                              <p className="text-sm">查询结果将在此处显示</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* R2 存储桶管理 */}
            {activeView === "r2-storage" && (
              <div className="max-w-7xl mx-auto space-y-4">
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle>R2 对象存储</CardTitle>
                    <CardDescription>管理您的 Cloudflare R2 存储桶</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {r2Error ? (
                      <div className="text-center py-12">
                        <HardDrive className="w-12 h-12 mx-auto text-destructive mb-4" />
                        <p className="font-medium text-destructive mb-2">无法加载 R2 存储桶</p>
                        <p className="text-sm text-muted-foreground mb-4">{r2Error}</p>
                        {r2Error.includes("enable R2") && (
                          <p className="text-xs text-muted-foreground">请前往 Cloudflare 控制台启用 R2 服务</p>
                        )}
                      </div>
                    ) : !Array.isArray(r2Buckets) || r2Buckets.length === 0 ? (
                      <div className="text-center py-12">
                        <HardDrive className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">暂无 R2 存储桶</p>
                        <p className="text-xs text-muted-foreground mt-2">请前往 Cloudflare 控制台创建 R2 存储桶</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {r2Buckets.map((bucket: any) => (
                          <div
                            key={bucket.name}
                            className="p-4 border border-border/50 rounded-lg hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h3 className="font-medium">{bucket.name}</h3>
                                <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                                  <span>位置: {bucket.location || "Auto"}</span>
                                  <span>创建时间: {new Date(bucket.creation_date).toLocaleString("zh-CN")}</span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedR2Bucket(bucket.name);
                                    setShowR2S3Config(true);
                                  }}
                                >
                                  <Key className="w-4 h-4 mr-1" />
                                  S3 API
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedR2Bucket(bucket.name);
                                  }}
                                >
                                  <Folder className="w-4 h-4 mr-1" />
                                  浏览文件
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    if (!confirm(`确定要删除存储桶 ${bucket.name} 吗？此操作不可撤销！`)) return;

                                    const email = getCookie("cf_email");
                                    const apiKey = getCookie("cf_api_key");
                                    if (!email || !apiKey || zones.length === 0) return;

                                    const accountId = zones[0]?.account?.id;
                                    if (!accountId) return;

                                    setIsLoading(true);
                                    try {
                                      const { data, error } = await supabase.functions.invoke("cloudflare-api", {
                                        body: {
                                          action: "delete_r2_bucket",
                                          email,
                                          apiKey,
                                          accountId,
                                          bucketName: bucket.name,
                                        },
                                      });

                                      if (error) throw error;

                                      if (data.success) {
                                        toast({
                                          title: "存储桶已删除",
                                          description: `${bucket.name} 已成功删除`,
                                        });
                                        loadR2Buckets();
                                      } else {
                                        throw new Error(data.errors?.[0]?.message || "删除失败");
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
                                  }}
                                  disabled={isLoading}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* S3 API 配置对话框 */}
                {showR2S3Config && selectedR2Bucket && (
                  <Card className="shadow-card">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Key className="w-5 h-5" />
                            S3 API 配置
                          </CardTitle>
                          <CardDescription>{selectedR2Bucket} 的 S3 兼容 API 配置</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setShowR2S3Config(false)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-muted p-4 rounded-lg space-y-3">
                        <div>
                          <Label className="text-xs font-semibold">Endpoint URL</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              value={`https://${zones[0]?.account?.id}.r2.cloudflarestorage.com`}
                              readOnly
                              className="font-mono text-sm"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  `https://${zones[0]?.account?.id}.r2.cloudflarestorage.com`,
                                );
                                toast({ title: "已复制到剪贴板" });
                              }}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs font-semibold">Bucket Name</Label>
                          <div className="flex gap-2 mt-1">
                            <Input value={selectedR2Bucket} readOnly className="font-mono text-sm" />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(selectedR2Bucket);
                                toast({ title: "已复制到剪贴板" });
                              }}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs font-semibold">Region</Label>
                          <div className="flex gap-2 mt-1">
                            <Input value="auto" readOnly className="font-mono text-sm" />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText("auto");
                                toast({ title: "已复制到剪贴板" });
                              }}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-border">
                          <p className="text-xs text-muted-foreground mb-2">
                            ⚠️ Access Key ID 和 Secret Access Key 需要在 Cloudflare 控制台创建
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              window.open(
                                `https://dash.cloudflare.com/${zones[0]?.account?.id}/r2/api-tokens`,
                                "_blank",
                              )
                            }
                          >
                            前往创建 R2 API 令牌
                          </Button>
                        </div>

                        <Button
                          className="w-full"
                          onClick={() => {
                            const config = `Endpoint: https://${zones[0]?.account?.id}.r2.cloudflarestorage.com\nBucket: ${selectedR2Bucket}\nRegion: auto`;
                            navigator.clipboard.writeText(config);
                            toast({ title: "S3 配置已复制" });
                          }}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          一键复制所有配置
                        </Button>
                      </div>

                      <div className="bg-primary/5 p-4 rounded-lg space-y-2">
                        <h4 className="text-sm font-semibold">使用示例 (AWS CLI)</h4>
                        <pre className="text-xs bg-background p-3 rounded border border-border overflow-x-auto">
                          {`aws s3 ls s3://${selectedR2Bucket} \\
  --endpoint-url https://${zones[0]?.account?.id}.r2.cloudflarestorage.com \\
  --region auto`}
                        </pre>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `aws s3 ls s3://${selectedR2Bucket} --endpoint-url https://${zones[0]?.account?.id}.r2.cloudflarestorage.com --region auto`,
                            );
                            toast({ title: "命令已复制" });
                          }}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          复制命令
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 文件浏览器 */}
                {selectedR2Bucket && !showR2S3Config && (
                  <Card className="shadow-card">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Folder className="w-5 h-5" />
                            {selectedR2Bucket} - 文件列表
                          </CardTitle>
                          <CardDescription>使用 S3 CLI 或 SDK 上传和管理文件</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedR2Bucket("")}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-12 space-y-4">
                        <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground mb-2">R2 文件管理需要使用 S3 兼容工具</p>
                          <p className="text-sm text-muted-foreground mb-4">推荐使用 AWS CLI、Rclone 或其他 S3 工具</p>
                        </div>
                        <div className="flex gap-2 justify-center">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowR2S3Config(true);
                            }}
                          >
                            <Key className="w-4 h-4 mr-2" />
                            查看 S3 API 配置
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => window.open("https://developers.cloudflare.com/r2/examples/", "_blank")}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            查看使用示例
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Cloudflare Tunnels 管理 */}
            {activeView === "tunnels" && (
              <div className="max-w-7xl mx-auto space-y-4">
                <Card className="shadow-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Cloudflare Tunnels</CardTitle>
                        <CardDescription>管理您的 Cloudflare Tunnel 连接</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => loadTunnels()}
                          disabled={isLoading || zones.length === 0}
                        >
                          <Loader2 className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                          刷新
                        </Button>
                        <Button
                          onClick={() => setCreateTunnelOpen(true)}
                          disabled={isLoading || zones.length === 0}
                          variant="outline"
                        >
                          <Network className="w-4 h-4 mr-2" />
                          创建说明
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoading && tunnels.length === 0 ? (
                      <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 mx-auto text-muted-foreground mb-4 animate-spin" />
                        <p className="text-muted-foreground">正在加载 Tunnel 列表...</p>
                      </div>
                    ) : tunnels.length === 0 ? (
                      <div className="text-center py-12">
                        <Network className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">暂无 Tunnel</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          点击上方"创建说明"按钮查看如何在 Cloudflare Dashboard 创建 Tunnel
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {tunnels.map((tunnel: any) => {
                          const hasConnections = tunnel.connections && tunnel.connections.length > 0;
                          const status = tunnel.status || (hasConnections ? "healthy" : "inactive");

                          return (
                            <div
                              key={tunnel.id}
                              className="p-4 border border-border/50 rounded-lg hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-medium truncate">{tunnel.name}</h3>
                                    {/* 状态徽章 */}
                                    {status === "healthy" && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-green-500/10 text-green-600 text-xs font-medium">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-600 mr-1.5"></span>
                                        活跃
                                      </span>
                                    )}
                                    {status === "down" && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 text-xs font-medium">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 mr-1.5"></span>
                                        离线
                                      </span>
                                    )}
                                    {status === "degraded" && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-600 text-xs font-medium">
                                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-600 mr-1.5"></span>
                                        降级
                                      </span>
                                    )}
                                    {status === "inactive" && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-500/10 text-gray-600 text-xs font-medium">
                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-600 mr-1.5"></span>
                                        未连接
                                      </span>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                      <Key className="w-3.5 h-3.5" />
                                      <span className="truncate">ID: {tunnel.id}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Settings className="w-3.5 h-3.5" />
                                      <span>创建: {new Date(tunnel.created_at).toLocaleString("zh-CN")}</span>
                                    </div>
                                  </div>

                                  {/* 连接信息 */}
                                  {hasConnections && (
                                    <div className="mt-3 p-2 bg-muted/50 rounded-md">
                                      <div className="flex items-center gap-2 text-sm">
                                        <Network className="w-4 h-4 text-green-600" />
                                        <span className="font-medium text-green-600">
                                          {tunnel.connections.length} 个活跃连接
                                        </span>
                                      </div>
                                      {tunnel.connections.slice(0, 2).map((conn: any, idx: number) => (
                                        <div
                                          key={conn.id || `conn-${idx}`}
                                          className="mt-1.5 text-xs text-muted-foreground pl-6"
                                        >
                                          <div className="flex items-center gap-2">
                                            <span>• {conn.colo_name || conn.id}</span>
                                            {conn.client_ip && (
                                              <span className="text-xs opacity-70">({conn.client_ip})</span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                      {tunnel.connections.length > 2 && (
                                        <div className="text-xs text-muted-foreground pl-6 mt-1">
                                          还有 {tunnel.connections.length - 2} 个连接...
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* 操作按钮 */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTunnel(tunnel);
                                      setTunnelRouteOpen(true);
                                    }}
                                    disabled={isLoading}
                                  >
                                    <Globe className="w-4 h-4 mr-1.5" />
                                    路由
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTunnel(tunnel);
                                      setTunnelConfigOpen(true);
                                    }}
                                    disabled={isLoading}
                                  >
                                    <FileText className="w-4 h-4 mr-1.5" />
                                    配置
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTunnel(tunnel);
                                      setEditTunnelOpen(true);
                                    }}
                                    disabled={isLoading}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={async () => {
                                      // 检查是否有活跃连接
                                      const hasActiveConnections = tunnel.connections && tunnel.connections.length > 0;

                                      if (hasActiveConnections) {
                                        toast({
                                          title: "无法删除",
                                          description: `Tunnel ${tunnel.name} 有 ${tunnel.connections.length} 个活跃连接。请先断开所有连接后再删除。`,
                                          variant: "destructive",
                                        });
                                        return;
                                      }

                                      if (!confirm(`确定要删除 Tunnel ${tunnel.name} 吗？此操作不可撤销！`)) return;

                                      const email = getCookie("cf_email");
                                      const apiKey = getCookie("cf_api_key");
                                      if (!email || !apiKey || zones.length === 0) return;

                                      const accountId = zones[0]?.account?.id;
                                      if (!accountId) return;

                                      setIsLoading(true);
                                      try {
                                        const { data, error } = await supabase.functions.invoke("cloudflare-api", {
                                          body: {
                                            action: "delete_tunnel",
                                            email,
                                            apiKey,
                                            accountId,
                                            tunnelId: tunnel.id,
                                          },
                                        });

                                        if (error) throw error;

                                        if (data.success) {
                                          toast({
                                            title: "Tunnel 已删除",
                                            description: `${tunnel.name} 已成功删除`,
                                          });
                                          loadTunnels();
                                        } else {
                                          const errorMsg = data.errors?.[0]?.message || "删除失败";
                                          throw new Error(errorMsg);
                                        }
                                      } catch (error: any) {
                                        console.error("Delete tunnel error:", error);
                                        toast({
                                          title: "删除失败",
                                          description: error.message || "请确保 Tunnel 没有活跃连接和关联的路由",
                                          variant: "destructive",
                                        });
                                      } finally {
                                        setIsLoading(false);
                                      }
                                    }}
                                    disabled={isLoading}
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
                  </CardContent>
                </Card>
              </div>
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
                  } catch (err: any) {
                    console.error("Retry deployment error:", err);
                    toast({
                      title: "重新部署失败",
                      description: err.message,
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
      {editingWorker && zones.length > 0 && zones[0]?.account?.id && (
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
      {zones.length > 0 && zones[0]?.account?.id && (
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
      {workerForD1Binding && zones.length > 0 && zones[0]?.account?.id && (
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
      {workerForR2Binding && zones.length > 0 && zones[0]?.account?.id && (
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
      {workerForKVBinding && zones.length > 0 && zones[0]?.account?.id && (
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
      {zones.length > 0 && zones[0]?.account?.id && (
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
      {workerForVariables && zones.length > 0 && zones[0]?.account?.id && (
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
      {zones.length > 0 && zones[0].account && (
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
