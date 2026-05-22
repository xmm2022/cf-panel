import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, FileText, Globe, Key, Loader2, Network, Settings, Trash2 } from "lucide-react";
import type { TunnelSummary } from "@/components/index-page/shared/index-page-types";
import type { TunnelsViewProps } from "./tunnels-types";

function tunnelStatus(tunnel: TunnelSummary): string {
  if (tunnel.status) return tunnel.status;
  return tunnel.connections?.length ? "healthy" : "inactive";
}

function statusLabel(status: string): string {
  switch (status) {
    case "healthy":
      return "活跃";
    case "down":
      return "离线";
    case "degraded":
      return "降级";
    case "inactive":
      return "未连接";
    default:
      return status;
  }
}

function statusClass(status: string): string {
  switch (status) {
    case "healthy":
      return "bg-green-500/10 text-green-600";
    case "down":
      return "bg-red-500/10 text-red-600";
    case "degraded":
      return "bg-yellow-500/10 text-yellow-600";
    default:
      return "bg-gray-500/10 text-gray-600";
  }
}

export function TunnelsView({
  tunnels,
  isLoading,
  canManage = true,
  onRefresh,
  onCreate,
  onEdit,
  onConfig,
  onRoute,
  onDelete,
}: TunnelsViewProps) {
  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Cloudflare Tunnels</CardTitle>
              <CardDescription>管理您的 Cloudflare Tunnel 连接</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onRefresh} disabled={isLoading || !canManage}>
                <Loader2 className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                刷新
              </Button>
              <Button onClick={onCreate} disabled={isLoading || !canManage} variant="outline">
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
              {tunnels.map((tunnel) => {
                const status = tunnelStatus(tunnel);
                const connections = tunnel.connections ?? [];

                return (
                  <div
                    key={tunnel.id}
                    className="p-4 border border-border/50 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium truncate">{tunnel.name}</h3>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${statusClass(
                              status,
                            )}`}
                          >
                            {statusLabel(status)}
                          </span>
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

                        {connections.length > 0 && (
                          <div className="mt-3 p-2 bg-muted/50 rounded-md">
                            <div className="flex items-center gap-2 text-sm">
                              <Network className="w-4 h-4 text-green-600" />
                              <span className="font-medium text-green-600">{connections.length} 个活跃连接</span>
                            </div>
                            {connections.slice(0, 2).map((conn, index) => (
                              <div
                                key={conn.id || `conn-${index}`}
                                className="mt-1.5 text-xs text-muted-foreground pl-6"
                              >
                                <span>{conn.colo_name || conn.id || "connection"}</span>
                                {conn.client_ip ? <span className="opacity-70 ml-2">({conn.client_ip})</span> : null}
                              </div>
                            ))}
                            {connections.length > 2 && (
                              <div className="text-xs text-muted-foreground pl-6 mt-1">
                                还有 {connections.length - 2} 个连接...
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button variant="outline" size="sm" onClick={() => onRoute(tunnel.id)} disabled={isLoading}>
                          <Globe className="w-4 h-4 mr-1.5" />
                          路由
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => onConfig(tunnel.id)} disabled={isLoading}>
                          <FileText className="w-4 h-4 mr-1.5" />
                          配置
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => onEdit(tunnel.id)} disabled={isLoading}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        {onDelete ? (
                          <Button variant="ghost" size="sm" onClick={() => onDelete(tunnel.id)} disabled={isLoading}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        ) : null}
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
  );
}
