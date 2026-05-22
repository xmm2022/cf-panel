import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Edit, Loader2, Settings, Trash2 } from "lucide-react";
import {
  getPageRuleActions,
  getPageRuleUrlPattern,
} from "./page-rule-form";
import type { PageRuleAction, PageRuleFormState, PageRulesViewProps } from "./page-rule-types";

function formatPageRuleAction(action: PageRuleAction): string {
  if (action.id === "forwarding_url" && typeof action.value === "object" && action.value) {
    const value = action.value as { status_code?: number; url?: string };
    return `${value.status_code} -> ${value.url}`;
  }

  if (action.id === "always_use_https") return "Always HTTPS";
  if (typeof action.value === "object" && action.value) return JSON.stringify(action.value);
  if (action.value === undefined) return action.id.replace(/_/g, " ");
  return `${action.id.replace(/_/g, " ")}: ${action.value}`;
}

function withMutualExclusion(
  form: PageRuleFormState,
  patch: Partial<PageRuleFormState>,
): PageRuleFormState {
  if (patch.alwaysUseHttps === "on") {
    return {
      ...form,
      ...patch,
      cacheLevel: "",
      browserCacheTtl: "",
      securityLevel: "",
      ssl: "",
    };
  }

  if (patch.forwardingType) {
    return {
      ...form,
      ...patch,
      cacheLevel: "",
      browserCacheTtl: "",
      securityLevel: "",
      ssl: "",
      alwaysUseHttps: "",
    };
  }

  return { ...form, ...patch };
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
  const hasExclusiveRule = Boolean(newPageRule.forwardingType || newPageRule.alwaysUseHttps === "on");

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
                {editingPageRuleId && (
                  <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded">编辑模式</span>
                )}
              </div>

              {hasExclusiveRule && (
                <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-600 dark:text-yellow-400">
                  注意：URL转发 和 始终HTTPS 不能与其他设置同时使用
                </div>
              )}

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
                <div>
                  <Label className="text-xs mb-1 block">规则状态</Label>
                  <select
                    className="w-full h-9 px-2 text-sm border border-border/50 rounded-md bg-background"
                    value={newPageRule.status}
                    onChange={(event) =>
                      onFormChange({
                        ...newPageRule,
                        status: event.target.value as PageRuleFormState["status"],
                      })
                    }
                  >
                    <option value="active">启用</option>
                    <option value="disabled">禁用</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div>
                  <Label className="text-xs mb-1 block">缓存级别</Label>
                  <select
                    className="w-full h-9 px-2 text-sm border border-border/50 rounded-md bg-background"
                    value={newPageRule.cacheLevel}
                    onChange={(event) => onFormChange({ ...newPageRule, cacheLevel: event.target.value })}
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
                    onChange={(event) => onFormChange({ ...newPageRule, browserCacheTtl: event.target.value })}
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
                    onChange={(event) => onFormChange({ ...newPageRule, securityLevel: event.target.value })}
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div>
                  <Label className="text-xs mb-1 block">SSL 模式</Label>
                  <select
                    className="w-full h-9 px-2 text-sm border border-border/50 rounded-md bg-background"
                    value={newPageRule.ssl}
                    onChange={(event) => onFormChange({ ...newPageRule, ssl: event.target.value })}
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
                    onChange={(event) =>
                      onFormChange(withMutualExclusion(newPageRule, { alwaysUseHttps: event.target.value }))
                    }
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
                    onChange={(event) =>
                      onFormChange(withMutualExclusion(newPageRule, { forwardingType: event.target.value }))
                    }
                    disabled={newPageRule.alwaysUseHttps === "on"}
                  >
                    <option value="">不设置</option>
                    <option value="301">301 永久</option>
                    <option value="302">302 临时</option>
                  </select>
                </div>
              </div>

              {newPageRule.forwardingType && (
                <div className="mb-3">
                  <Label className="text-xs mb-1 block">目标 URL</Label>
                  <Input
                    placeholder="https://example.com/new-path"
                    value={newPageRule.forwardingUrl}
                    onChange={(event) => onFormChange({ ...newPageRule, forwardingUrl: event.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={onResetForm} disabled={isLoading}>
                  {editingPageRuleId ? "取消" : "重置"}
                </Button>
                <Button size="sm" onClick={onSubmit} disabled={isLoading}>
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

            <div className="p-3 border border-border/50 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-sm">现有规则</h3>
                <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
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
                  {pageRules.map((rule) => {
                    const actions = getPageRuleActions(rule);
                    const urlPattern = getPageRuleUrlPattern(rule);

                    return (
                      <div
                        key={rule.id}
                        className="p-3 border border-border/50 rounded-lg hover:bg-accent/5 transition-colors"
                      >
                        <div className="flex justify-between items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Switch
                                checked={rule.status === "active"}
                                onCheckedChange={(checked) => onToggleRule(rule.id, checked)}
                                disabled={isLoading}
                              />
                              <span
                                className={`text-xs font-medium ${
                                  rule.status === "active" ? "text-green-500" : "text-gray-500"
                                }`}
                              >
                                {rule.status === "active" ? "启用" : "禁用"}
                              </span>
                              {rule.priority !== undefined && (
                                <span className="text-xs text-muted-foreground">P{rule.priority}</span>
                              )}
                            </div>
                            <p className="text-xs font-medium mb-1 truncate">{urlPattern || "未设置"}</p>
                            <div className="flex flex-wrap gap-1">
                              {actions.map((action, idx) => (
                                <span
                                  key={`${action.id}-${idx}`}
                                  className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded"
                                >
                                  {formatPageRuleAction(action)}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => onEditRule(rule.id)}
                              disabled={isLoading}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              编辑
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => onDeleteRule(rule.id)}
                              disabled={isLoading}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
