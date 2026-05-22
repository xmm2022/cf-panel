import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Code2, Upload } from "lucide-react";

export interface CreatePagesProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectMethod: (method: "upload" | "git") => void;
}

export function CreatePagesProjectDialog({
  open,
  onOpenChange,
  onSelectMethod,
}: CreatePagesProjectDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>创建 Pages 项目</AlertDialogTitle>
          <AlertDialogDescription>选择部署方式在 Cloudflare Dashboard 中创建项目</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* 部署方式选择 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 文件上传方式 */}
            <Card
              className="cursor-pointer hover:border-primary transition-all"
              onClick={() => onSelectMethod("upload")}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Upload className="w-5 h-5" />
                  上传文件部署
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">直接上传静态网站文件到 Cloudflare Pages</p>

                <div className="space-y-2 text-sm">
                  <div className="font-medium">支持方式：</div>
                  <ul className="space-y-1 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Dashboard 拖拽上传整个文件夹</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Wrangler CLI 命令行部署</span>
                    </li>
                  </ul>
                </div>

                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    💡 推荐：Dashboard 支持拖拽上传，操作简单直观
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Git 仓库方式 */}
            <Card
              className="cursor-pointer hover:border-primary transition-all"
              onClick={() => onSelectMethod("git")}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Code2 className="w-5 h-5" />
                  连接 Git 仓库
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">连接 GitHub/GitLab 实现自动化部署</p>

                <div className="space-y-2 text-sm">
                  <div className="font-medium">功能特性：</div>
                  <ul className="space-y-1 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>代码提交自动触发部署</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>预览环境支持</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>回滚到任意版本</span>
                    </li>
                  </ul>
                </div>

                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-xs text-green-600 dark:text-green-400">✨ 推荐：适合持续开发的项目</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Wrangler CLI 使用说明 */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Code2 className="w-4 h-4" />
                使用 Wrangler CLI 部署
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-2 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">#</span>
                  <code className="bg-background px-2 py-1 rounded">npm install -g wrangler</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">#</span>
                  <code className="bg-background px-2 py-1 rounded">wrangler login</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">#</span>
                  <code className="bg-background px-2 py-1 rounded">wrangler pages deploy &lt;directory&gt;</code>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>关闭</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
