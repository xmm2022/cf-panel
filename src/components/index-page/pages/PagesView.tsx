import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Code2,
  Copy,
  FileText,
  Globe,
  History,
  Loader2,
  Play,
  Settings,
  Upload,
  X,
  Zap,
} from "lucide-react";
import type { PagesDeploymentSummary, PagesDomain, PagesProjectSummary } from "./pages-types";

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
              <Button
                variant="outline"
                onClick={onRefresh}
                disabled={isLoadingPages || !zonesReady}
              >
                <Loader2 className={`w-4 h-4 mr-2 ${isLoadingPages ? "animate-spin" : ""}`} />
                刷新
              </Button>
              <Button
                onClick={onCreateProject}
                disabled={isLoadingPages || !zonesReady}
              >
                <Upload className="w-4 h-4 mr-2" />
                新建项目
              </Button>
              <Button
                onClick={onOpenDashboard}
                variant="outline"
              >
                <Globe className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingPages && pagesProjects.length === 0 ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 mx-auto text-muted-foreground mb-4 animate-spin" />
              <p className="text-muted-foreground">正在加载 Pages 项目...</p>
            </div>
          ) : pagesProjects.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold mb-2">暂无 Pages 项目</h3>
                <p className="text-muted-foreground mb-4">您还没有创建任何 Pages 项目</p>
                <Button
                  onClick={onOpenDashboard}
                  variant="outline"
                >
                  <Globe className="w-4 h-4 mr-2" />
                  前往 Dashboard 创建项目
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {pagesProjects.map((project: PagesProjectSummary) => (
                <div
                  key={project.id || project.name}
                  className="p-4 border border-border/50 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium truncate">{project.name}</h3>
                        {/* 状态徽章 */}
                        {project.production_deployment && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-green-500/10 text-green-600 text-xs font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-600 mr-1.5"></span>
                            已部署
                          </span>
                        )}
                        {!project.production_deployment && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-500/10 text-gray-600 text-xs font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-600 mr-1.5"></span>
                            未部署
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground mb-3">
                        {/* Pages.dev 域名 */}
                        {project.subdomain && (
                          <div className="flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5" />
                            <a
                              href={`https://${project.subdomain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate hover:text-primary transition-colors"
                            >
                              {project.subdomain}
                            </a>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0"
                              onClick={() => onCopyText(`https://${project.subdomain}`, "URL 已复制")}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Settings className="w-3.5 h-3.5" />
                          <span>创建: {new Date(project.created_on).toLocaleDateString("zh-CN")}</span>
                        </div>
                      </div>

                      {/* 自定义域名 */}
                      {project.domains && project.domains.length > 0 && (
                        <div className="mb-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {project.domains.slice(0, 3).map((domain: string | PagesDomain, idx: number) => {
                              const domainName = typeof domain === "string" ? domain : domain.name;

                              return (
                                <div
                                  key={idx}
                                  className="flex items-center gap-1 bg-muted/50 rounded px-2 py-1"
                                >
                                  <Globe className="w-3 h-3 text-primary" />
                                  <a
                                    href={`https://${domainName}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline"
                                  >
                                    {domainName}
                                  </a>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-4 w-4 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onCopyText(`https://${domainName}`, "自定义域名已复制");
                                    }}
                                  >
                                    <Copy className="w-2.5 h-2.5" />
                                  </Button>
                                </div>
                              );
                            })}
                            {project.domains.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{project.domains.length - 3} 更多
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 生产环境部署信息 */}
                      {project.production_deployment && (
                        <div className="p-2 bg-muted/50 rounded-md text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <Zap className="w-4 h-4 text-primary" />
                            <span className="font-medium">生产环境</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs text-muted-foreground pl-6">
                            {project.production_deployment.environment && (
                              <div>环境: {project.production_deployment.environment}</div>
                            )}
                            {project.production_deployment.url && (
                              <div className="truncate">
                                <a
                                  href={project.production_deployment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-primary transition-colors"
                                >
                                  {project.production_deployment.url}
                                </a>
                              </div>
                            )}
                            {project.production_deployment.latest_stage && (
                              <div>状态: {project.production_deployment.latest_stage.name || "unknown"}</div>
                            )}
                            {project.production_deployment.created_on && (
                              <div>
                                部署:{" "}
                                {new Date(project.production_deployment.created_on).toLocaleString("zh-CN")}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 源码信息 */}
                      {project.source && (
                        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-4">
                          {project.source.type && (
                            <div className="flex items-center gap-1">
                              <Code2 className="w-3 h-3" />
                              源码: {project.source.type}
                            </div>
                          )}
                          {project.source.config && project.source.config.owner && (
                            <div className="truncate">
                              仓库: {project.source.config.owner}/{project.source.config.repo_name}
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
                        onClick={() => onOpenDeployments(project.name)}
                        disabled={isLoadingPages}
                      >
                        <History className="w-4 h-4 mr-1.5" />
                        部署
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenProjectDashboard(project.name)}
                        disabled={isLoadingPages}
                      >
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

      {/* 部署历史 */}
      {showPagesDeployments && selectedPagesProject && (
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  部署历史 - {selectedPagesProject}
                </CardTitle>
                <CardDescription>查看项目的所有部署记录</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCloseDeployments}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingPages && pagesDeployments.length === 0 ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 mx-auto text-muted-foreground mb-3 animate-spin" />
                <p className="text-sm text-muted-foreground">加载部署历史...</p>
              </div>
            ) : pagesDeployments.length === 0 ? (
              <div className="text-center py-8">
                <History className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">暂无部署记录</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pagesDeployments.map((deployment: PagesDeploymentSummary) => (
                  <div
                    key={deployment.id}
                    className="p-3 border border-border/50 rounded-md hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm truncate">{deployment.id.slice(0, 8)}</span>
                          {/* 环境标签 */}
                          {deployment.environment === "production" && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                              生产
                            </span>
                          )}
                          {deployment.environment === "preview" && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-accent/10 text-accent">
                              预览
                            </span>
                          )}
                          {/* 状态标签 */}
                          {deployment.latest_stage?.name === "deploy" &&
                            deployment.latest_stage?.status === "success" && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-600">
                                成功
                              </span>
                            )}
                          {deployment.latest_stage?.name === "deploy" &&
                            deployment.latest_stage?.status === "failure" && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-600">
                                失败
                              </span>
                            )}
                          {deployment.latest_stage?.status === "active" && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-600">
                              进行中
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-muted-foreground">
                          {deployment.url && (
                            <div className="flex items-center gap-1 truncate">
                              <Globe className="w-3 h-3 flex-shrink-0" />
                              <a
                                href={deployment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="truncate hover:text-primary transition-colors"
                              >
                                {deployment.url.replace("https://", "")}
                              </a>
                            </div>
                          )}
                          {deployment.created_on && (
                            <div className="flex items-center gap-1">
                              <Settings className="w-3 h-3" />
                              {new Date(deployment.created_on).toLocaleString("zh-CN")}
                            </div>
                          )}
                          {deployment.build_config?.build_command && (
                            <div className="flex items-center gap-1 truncate">
                              <Code2 className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{deployment.build_config.build_command}</span>
                            </div>
                          )}
                        </div>

                        {/* 提交信息 */}
                        {deployment.deployment_trigger?.metadata && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              {deployment.deployment_trigger.metadata.commit_message && (
                                <span className="truncate">
                                  💬 {deployment.deployment_trigger.metadata.commit_message}
                                </span>
                              )}
                            </div>
                            {deployment.deployment_trigger.metadata.branch && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <span>分支: {deployment.deployment_trigger.metadata.branch}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {deployment.url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => window.open(deployment.url, "_blank")}
                          >
                            <Globe className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => onRetryDeployment(deployment.id)}
                          disabled={isLoadingPages}
                        >
                          <Play className="w-3.5 h-3.5" />
                        </Button>
                      </div>
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
