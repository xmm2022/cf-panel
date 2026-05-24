import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Key, Loader2, Trash2 } from "lucide-react";
import { useRef } from "react";
import type { KVKeySummary, KVNamespaceSummary } from "@/components/index-page/shared/index-page-types";
import type { KvStorageViewProps } from "./kv-storage-types";

export function KvStorageView({
  kvNamespaces,
  selectedKvNamespace,
  kvKeys,
  selectedKvKeys,
  isLoading,
  onCreateNamespace,
  onRefreshNamespaces,
  onDeleteNamespace,
  onNamespaceChange,
  onSaveKeyValue,
  onReadValue,
  onDeleteKey,
  onExportKeys,
  onImportKeys,
  onLoadKeys,
  onDeleteSelectedKeys,
  onToggleKeySelection,
}: KvStorageViewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="max-w-6xl mx-auto">
      <Card className="shadow-card mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            KV 存储管理
          </CardTitle>
          <CardDescription>管理 KV 命名空间和键值对</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* 创建命名空间 */}
            <div className="p-4 border border-border/50 rounded-lg">
              <h3 className="font-medium mb-4">创建 KV 命名空间</h3>
              <div className="flex gap-2">
                <Input placeholder="输入命名空间名称" id="kv-namespace-name" className="flex-1" />
                <Button
                  onClick={() => {
                    const input = document.getElementById("kv-namespace-name") as HTMLInputElement | null;
                    const namespaceName = input?.value || "";
                    onCreateNamespace(namespaceName);
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      创建中...
                    </>
                  ) : (
                    "创建命名空间"
                  )}
                </Button>
              </div>
            </div>

            {/* 命名空间列表 */}
            <div className="p-4 border border-border/50 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">KV 命名空间列表</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefreshNamespaces}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      加载中...
                    </>
                  ) : (
                    "刷新列表"
                  )}
                </Button>
              </div>
              {kvNamespaces.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  暂无命名空间数据，点击上方创建或刷新列表
                </div>
              ) : (
                <div className="space-y-2">
                  {kvNamespaces.map((ns: KVNamespaceSummary) => (
                    <div key={ns.id} className="p-3 border border-border/50 rounded-md bg-card/50">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{ns.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">ID: {ns.id}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteNamespace(ns)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 键值对管理 */}
            <div className="p-4 border border-border/50 rounded-lg">
              <h3 className="font-medium mb-4">键值对管理</h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm mb-2 block">选择命名空间</Label>
                  <select
                    className="w-full p-2 border border-border/50 rounded-md bg-background"
                    value={selectedKvNamespace}
                    onChange={(e) => onNamespaceChange(e.target.value)}
                  >
                    <option value="">
                      {kvNamespaces.length === 0 ? "请先加载命名空间列表" : "请选择命名空间"}
                    </option>
                    {kvNamespaces.map((ns: KVNamespaceSummary) => (
                      <option key={ns.id} value={ns.id}>
                        {ns.title} (ID: {ns.id})
                      </option>
                    ))}
                  </select>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">添加/更新键值对</h4>
                  <div>
                    <Label className="text-sm mb-2 block">键 (Key)</Label>
                    <Input placeholder="例如：user:123" id="kv-key" className="mb-2" />
                  </div>
                  <div>
                    <Label className="text-sm mb-2 block">值 (Value)</Label>
                    <textarea
                      placeholder='例如：{"name": "John", "age": 30}'
                      id="kv-value"
                      className="w-full min-h-[100px] p-2 border border-border/50 rounded-md bg-background"
                    />
                    <p className="text-xs text-muted-foreground mt-1">支持文本、JSON 等格式</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={onSaveKeyValue}>
                      保存键值对
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={onReadValue}>
                      读取值
                    </Button>
                    <Button variant="destructive" className="flex-1" onClick={onDeleteKey}>
                      删除键
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">批量操作</h4>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={onExportKeys}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-2"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" x2="12" y1="15" y2="3" />
                      </svg>
                      导出为 JSON
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-2"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" x2="12" y1="3" y2="15" />
                      </svg>
                      从 JSON 导入
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/json"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          onImportKeys(file);
                          event.target.value = "";
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    导入格式：{`[{"key": "key1", "value": "value1"}, ...]`}
                  </p>
                </div>

                <Separator />

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium">键列表</h4>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={onLoadKeys}>
                        加载键列表
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={selectedKvKeys.length === 0}
                        onClick={onDeleteSelectedKeys}
                      >
                        批量删除
                      </Button>
                    </div>
                  </div>
                  {!selectedKvNamespace ? (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      选择命名空间后加载键列表
                    </div>
                  ) : kvKeys.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      暂无键，点击“加载键列表”获取
                    </div>
                  ) : (
                    <div className="border border-border/50 rounded-md divide-y max-h-64 overflow-auto">
                      {kvKeys.map((item: KVKeySummary) => (
                        <label
                          key={item.name}
                          className="flex items-center gap-3 p-2 cursor-pointer hover:bg-muted/40"
                        >
                          <input
                            type="checkbox"
                            checked={selectedKvKeys.includes(item.name)}
                            onChange={(e) => onToggleKeySelection(item.name, e.target.checked)}
                          />
                          <span className="text-sm font-mono truncate">{item.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
