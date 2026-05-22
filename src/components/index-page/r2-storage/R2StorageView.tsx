import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, FileText, Folder, HardDrive, Key, Loader2, Trash2, Upload, X } from "lucide-react";
import type { R2StorageViewProps } from "./r2-storage-types";

function formatUploaded(uploaded: string | undefined): string {
  if (!uploaded) return "";
  return new Date(uploaded).toLocaleString("zh-CN");
}

export function R2StorageView({
  buckets,
  selectedBucket,
  files,
  error,
  isLoading,
  isLoadingFiles,
  isUploading,
  showS3Config,
  accountId,
  onSelectBucket,
  onShowS3Config,
  onCloseS3Config,
  onRefreshBuckets,
  onRefreshFiles,
  onUploadFile,
  onDeleteBucket,
  onOpenExamples,
  onCopy,
}: R2StorageViewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const endpoint = accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "";

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>R2 对象存储</CardTitle>
              <CardDescription>管理您的 Cloudflare R2 存储桶</CardDescription>
            </div>
            <Button variant="outline" onClick={onRefreshBuckets} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-12">
              <HardDrive className="w-12 h-12 mx-auto text-destructive mb-4" />
              <p className="font-medium text-destructive mb-2">无法加载 R2 存储桶</p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              {error.includes("enable R2") && (
                <p className="text-xs text-muted-foreground">请前往 Cloudflare 控制台启用 R2 服务</p>
              )}
            </div>
          ) : buckets.length === 0 ? (
            <div className="text-center py-12">
              <HardDrive className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">暂无 R2 存储桶</p>
              <p className="text-xs text-muted-foreground mt-2">请前往 Cloudflare 控制台创建 R2 存储桶</p>
            </div>
          ) : (
            <div className="space-y-3">
              {buckets.map((bucket) => (
                <div
                  key={bucket.name}
                  className="p-4 border border-border/50 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-medium">{bucket.name}</h3>
                      <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                        <span>位置: {bucket.location || "Auto"}</span>
                        <span>创建时间: {new Date(bucket.creation_date).toLocaleString("zh-CN")}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => onShowS3Config(bucket.name)}>
                        <Key className="w-4 h-4 mr-1" />
                        S3 API
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onSelectBucket(bucket.name)}>
                        <Folder className="w-4 h-4 mr-1" />
                        浏览文件
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onDeleteBucket(bucket.name)} disabled={isLoading}>
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

      {showS3Config && selectedBucket && (
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  S3 API 配置
                </CardTitle>
                <CardDescription>{selectedBucket} 的 S3 兼容 API 配置</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={onCloseS3Config}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <div>
                <Label className="text-xs font-semibold">Endpoint URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={endpoint} readOnly className="font-mono text-sm" />
                  <Button size="sm" variant="outline" onClick={() => onCopy(endpoint)} disabled={!endpoint}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Bucket Name</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={selectedBucket} readOnly className="font-mono text-sm" />
                  <Button size="sm" variant="outline" onClick={() => onCopy(selectedBucket)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Region</Label>
                <div className="flex gap-2 mt-1">
                  <Input value="auto" readOnly className="font-mono text-sm" />
                  <Button size="sm" variant="outline" onClick={() => onCopy("auto")}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">
                  Access Key ID 和 Secret Access Key 需要在 Cloudflare 控制台创建
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (accountId) window.open(`https://dash.cloudflare.com/${accountId}/r2/api-tokens`, "_blank");
                  }}
                  disabled={!accountId}
                >
                  前往创建 R2 API 令牌
                </Button>
              </div>

              <Button
                className="w-full"
                onClick={() => onCopy(`Endpoint: ${endpoint}\nBucket: ${selectedBucket}\nRegion: auto`)}
                disabled={!endpoint}
              >
                <Copy className="w-4 h-4 mr-2" />
                复制完整配置
              </Button>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">AWS CLI 示例:</p>
              <code className="text-xs font-mono block whitespace-pre-wrap">
                {`aws s3 ls s3://${selectedBucket} \\
  --endpoint-url ${endpoint || "https://<account-id>.r2.cloudflarestorage.com"} \\
  --region auto`}
              </code>
              <Button
                size="sm"
                variant="ghost"
                className="mt-2"
                onClick={() =>
                  onCopy(
                    `aws s3 ls s3://${selectedBucket} --endpoint-url ${
                      endpoint || "https://<account-id>.r2.cloudflarestorage.com"
                    } --region auto`,
                  )
                }
              >
                <Copy className="w-4 h-4 mr-1" />
                复制命令
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedBucket && !showS3Config && (
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Folder className="w-5 h-5" />
                  {selectedBucket} - 文件列表
                </CardTitle>
                <CardDescription>使用 S3 CLI 或 SDK 上传和管理文件</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onSelectBucket("")}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              <Button variant="outline" onClick={onRefreshFiles} disabled={isLoadingFiles}>
                {isLoadingFiles ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                刷新文件
              </Button>
              <Button variant="outline" onClick={() => onShowS3Config()} disabled={!selectedBucket}>
                <Key className="w-4 h-4 mr-2" />
                查看 S3 API 配置
              </Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                上传文件
              </Button>
              <Button variant="outline" onClick={onOpenExamples}>
                <FileText className="w-4 h-4 mr-2" />
                查看使用示例
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onUploadFile(file);
                  event.target.value = "";
                }}
              />
            </div>

            {files.length > 0 ? (
              <div className="space-y-1">
                {files.map((file) => (
                  <div
                    key={file.key}
                    className="p-2 border border-border/50 rounded-md flex items-center justify-between gap-4"
                  >
                    <span className="font-mono text-sm truncate">{file.key}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {file.size ?? 0} bytes {formatUploaded(file.uploaded)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 space-y-4">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground mb-2">R2 文件管理需要使用 S3 兼容工具</p>
                  <p className="text-sm text-muted-foreground mb-4">推荐使用 AWS CLI、Rclone 或其他 S3 工具</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
