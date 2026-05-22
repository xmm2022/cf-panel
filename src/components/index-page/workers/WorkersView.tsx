import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Copy,
  Database,
  Edit,
  Globe,
  HardDrive,
  Key,
  LayoutDashboard,
  Loader2,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import type { WorkerBindingSummary, WorkerListItem, WorkerRouteSummary, WorkersViewProps } from "./workers-types";

function sortWorkersByModifiedTime(scripts: WorkerListItem[]): WorkerListItem[] {
  return [...scripts].sort((a, b) => {
    const dateA = new Date(a.modifiedOn || a.createdOn || 0);
    const dateB = new Date(b.modifiedOn || b.createdOn || 0);
    return dateB.getTime() - dateA.getTime();
  });
}

function getRouteDomain(route: WorkerRouteSummary): string {
  return (route.pattern || "").replace(/\/\*$/, "").replace(/^https?:\/\//, "");
}

function getRouteUrl(route: WorkerRouteSummary): string {
  const pattern = route.pattern || "";
  if (pattern.startsWith("http")) return pattern.replace("/*", "");
  return `https://${getRouteDomain(route)}`;
}

function getBindingLabel(binding: WorkerBindingSummary): string {
  return binding.realName || binding.bucket_name || binding.name;
}

export function WorkersView({
  scripts,
  isLoading,
  onRefresh,
  onCreate,
  onEdit,
  onDelete,
  workerSubdomain,
  bindingsByWorkerId = {},
  analyticsPanel,
  onCopyUrl,
  onBindD1,
  onBindR2,
  onBindKV,
  onManageVariables,
}: WorkersViewProps) {
  const hasBindingActions = Boolean(onBindD1 || onBindR2 || onBindKV);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {analyticsPanel}

      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5" />
                Workers 列表
              </CardTitle>
              <CardDescription>查看和管理您的边缘函数</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onRefresh} disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                刷新
              </Button>
              <Button onClick={onCreate} disabled={isLoading}>
                <Plus className="w-4 h-4 mr-2" />
                新建 Worker
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : scripts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">暂无 Workers</p>
          ) : (
            <div className="space-y-2">
              {sortWorkersByModifiedTime(scripts).map((worker) => {
                const bindings = bindingsByWorkerId[worker.id] ?? [];
                const createdAt = worker.createdOn || worker.modifiedOn;
                const timestampLabel = worker.createdOn ? "创建时间" : "最后修改";

                return (
                  <div
                    key={worker.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer gap-4"
                    onClick={() => onEdit(worker.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{worker.id}</h3>
                      <div className="flex flex-col gap-1.5 mt-1">
                        {workerSubdomain && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <a
                              href={`https://${worker.id}.${workerSubdomain}.workers.dev`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(event) => event.stopPropagation()}
                              className="text-xs text-primary hover:underline break-all"
                            >
                              https://{worker.id}.{workerSubdomain}.workers.dev
                            </a>
                            {onCopyUrl && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onCopyUrl(
                                    `https://${worker.id}.${workerSubdomain}.workers.dev`,
                                    "workersDev",
                                  );
                                }}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            )}

                            {bindings
                              .filter((binding) => binding.type === "d1")
                              .map((binding, idx) => (
                                <span
                                  key={`d1-${idx}`}
                                  className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs rounded flex items-center gap-1"
                                  title={`D1 Database: ${getBindingLabel(binding)}`}
                                >
                                  <Database className="w-3 h-3" />
                                  D1:{getBindingLabel(binding)}
                                </span>
                              ))}
                            {bindings
                              .filter((binding) => binding.type === "kv_namespace")
                              .map((binding, idx) => (
                                <span
                                  key={`kv-${idx}`}
                                  className="px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs rounded flex items-center gap-1"
                                  title={`KV Namespace: ${getBindingLabel(binding)}`}
                                >
                                  <Key className="w-3 h-3" />
                                  KV:{getBindingLabel(binding)}
                                </span>
                              ))}
                            {bindings
                              .filter((binding) => binding.type === "r2_bucket")
                              .map((binding, idx) => (
                                <span
                                  key={`r2-${idx}`}
                                  className="px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 text-xs rounded flex items-center gap-1"
                                  title={`R2 Bucket: ${getBindingLabel(binding)}`}
                                >
                                  <HardDrive className="w-3 h-3" />
                                  R2:{getBindingLabel(binding)}
                                </span>
                              ))}
                          </div>
                        )}

                        {!!worker.routes?.length && (
                          <div className="flex flex-wrap items-center gap-2">
                            {worker.routes.slice(0, 3).map((route, idx) => (
                              <div key={route.id ?? idx} className="flex items-center gap-1">
                                <Globe className="w-3 h-3 text-muted-foreground" />
                                <a
                                  href={getRouteUrl(route)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(event) => event.stopPropagation()}
                                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                                >
                                  {getRouteDomain(route)}
                                </a>
                                {onCopyUrl && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 w-5 p-0"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      onCopyUrl(getRouteUrl(route), "customDomain");
                                    }}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            ))}
                            {worker.routes.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{worker.routes.length - 3} 更多
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {timestampLabel}: {new Date(createdAt).toLocaleString("zh-CN")}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0" onClick={(event) => event.stopPropagation()}>
                      {hasBindingActions && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" title="绑定资源">
                              <Database className="w-4 h-4 mr-1" />
                              绑定
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {onBindD1 && (
                              <DropdownMenuItem onClick={() => onBindD1(worker.id)}>
                                <Database className="w-4 h-4 mr-2" />
                                D1 数据库
                              </DropdownMenuItem>
                            )}
                            {onBindR2 && (
                              <DropdownMenuItem onClick={() => onBindR2(worker.id)}>
                                <HardDrive className="w-4 h-4 mr-2" />
                                R2 存储桶
                              </DropdownMenuItem>
                            )}
                            {onBindKV && (
                              <DropdownMenuItem onClick={() => onBindKV(worker.id)}>
                                <Key className="w-4 h-4 mr-2" />
                                KV 命名空间
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      {onManageVariables && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onManageVariables(worker.id)}
                          title="管理环境变量"
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => onEdit(worker.id)}>
                        <Edit className="w-4 h-4 mr-1" />
                        编辑
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => onDelete(worker.id)}>
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
    </div>
  );
}
