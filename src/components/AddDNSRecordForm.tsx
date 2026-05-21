import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase-adapter";
import { getCookie } from "@/lib/cookies";
import { recordOperation } from "@/lib/operation-logger";

interface AddDNSRecordFormProps {
  zoneId: string;
  onSuccess: () => void;
  cfEmail?: string;
  cfApiKey?: string;
}

const AddDNSRecordForm = ({ zoneId, onSuccess, cfEmail: propEmail, cfApiKey: propApiKey }: AddDNSRecordFormProps) => {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [recordType, setRecordType] = useState("A");
  const [recordName, setRecordName] = useState("");
  const [recordContent, setRecordContent] = useState("");
  const [proxied, setProxied] = useState(false);
  const [ttl, setTtl] = useState("1");

  const resetForm = () => {
    setRecordType("A");
    setRecordName("");
    setRecordContent("");
    setProxied(false);
    setTtl("1");
    setIsExpanded(false);
    setIsBatchMode(false);
  };

  const handleSubmit = async () => {
    if (!recordName || !recordContent) {
      toast({
        title: "请填写完整的记录信息",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const email = getCookie('cf_email') || propEmail;
      const apiKey = getCookie('cf_api_key') || propApiKey;

      if (!email || !apiKey) {
        throw new Error("未找到 Cloudflare 凭据");
      }

      const { data, error } = await supabase.functions.invoke('cloudflare-api', {
        body: {
          action: 'create_dns_record',
          email,
          apiKey,
          zoneId,
          recordData: {
            type: recordType,
            name: recordName,
            content: recordContent,
            proxied: proxied,
            ttl: parseInt(ttl)
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "DNS 记录创建成功",
          description: `${recordType} 记录 ${recordName} 已添加`,
        });
        
        // 记录操作历史
        recordOperation({
          userId: email,
          operationType: 'create',
          resourceType: 'dns_record',
          resourceName: `${recordType} ${recordName}`,
          zoneId: zoneId,
          actionDetails: `创建 ${recordType} 记录: ${recordName} -> ${recordContent}`,
        });
        
        resetForm();
        onSuccess();
      } else {
        throw new Error(data.errors?.[0]?.message || "创建失败");
      }
    } catch (error) {
      toast({
        title: "创建失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isExpanded) {
    return (
      <div className="flex gap-2 mb-4">
        <Button
          onClick={() => {
            setIsExpanded(true);
            setIsBatchMode(false);
          }}
          className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
        >
          <Plus className="w-4 h-4 mr-2" />
          添加 DNS 记录
        </Button>
        <Button
          onClick={() => {
            setIsExpanded(true);
            setIsBatchMode(true);
          }}
          variant="outline"
          className="flex-1"
        >
          <Upload className="w-4 h-4 mr-2" />
          批量添加 DNS 记录
        </Button>
      </div>
    );
  }

  if (isBatchMode) {
    return (
      <Card className="mb-4 shadow-card">
        <CardHeader>
          <CardTitle>批量添加 DNS 记录</CardTitle>
          <CardDescription>通过 JSON 格式批量导入 DNS 记录</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 批量导入 */}
          <div className="p-4 border border-border/50 rounded-lg">
            <h3 className="font-medium mb-2">批量导入 DNS 记录</h3>
            <p className="text-sm text-muted-foreground mb-4">
              上传 JSON 文件批量创建 DNS 记录
            </p>
            <div className="space-y-3">
              <div>
                <Label className="text-sm mb-2 block">JSON 文件格式示例</Label>
                <div className="p-3 bg-muted/30 rounded text-xs font-mono overflow-x-auto">
                  {`[
  {
    "type": "A",
    "name": "www",
    "content": "192.168.1.1",
    "proxied": true,
    "ttl": 1
  },
  {
    "type": "CNAME",
    "name": "blog",
    "content": "example.com",
    "proxied": false,
    "ttl": 3600
  }
]`}
                </div>
              </div>
              <div>
                <Input
                  type="file"
                  accept=".json"
                  id="json-upload"
                  className="cursor-pointer"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    try {
                      const text = await file.text();
                      const records = JSON.parse(text);
                      
                      if (!Array.isArray(records)) {
                        toast({
                          title: "JSON 格式错误",
                          description: "JSON 文件必须包含一个记录数组",
                          variant: "destructive",
                        });
                        return;
                      }

                        const email = getCookie('cf_email') || propEmail;
                        const apiKey = getCookie('cf_api_key') || propApiKey;
                      if (!email || !apiKey) return;

                      setIsSubmitting(true);
                      let successCount = 0;
                      let failCount = 0;

                      for (const record of records) {
                        if (!record.type || !record.name || !record.content) {
                          failCount++;
                          continue;
                        }

                        try {
                          const { data, error } = await supabase.functions.invoke('cloudflare-api', {
                            body: {
                              action: 'create_dns_record',
                              email,
                              apiKey,
                              zoneId,
                              recordData: {
                                type: record.type,
                                name: record.name,
                                content: record.content,
                                proxied: record.proxied ?? false,
                                ttl: record.ttl ?? 1
                              }
                            }
                          });

                          if (error || !data.success) {
                            failCount++;
                          } else {
                            successCount++;
                            // 记录操作历史
                            recordOperation({
                              userId: email,
                              operationType: 'create',
                              resourceType: 'dns_record',
                              resourceName: `${record.type} ${record.name}`,
                              zoneId: zoneId,
                              actionDetails: `批量创建 ${record.type} 记录: ${record.name}`,
                            });
                          }
                        } catch {
                          failCount++;
                        }
                      }

                      setIsSubmitting(false);
                      toast({
                        title: "批量导入完成",
                        description: `成功: ${successCount}, 失败: ${failCount}`,
                      });
                      e.target.value = '';
                      onSuccess();
                    } catch (error) {
                      toast({
                        title: "JSON 解析错误",
                        description: "请确保上传的是有效的 JSON 文件",
                        variant: "destructive",
                      });
                      setIsSubmitting(false);
                    }
                  }}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          <Button
            onClick={resetForm}
            variant="outline"
            disabled={isSubmitting}
            className="w-full"
          >
            取消
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4 shadow-card">
      <CardHeader>
        <CardTitle>添加 DNS 记录</CardTitle>
        <CardDescription>为域名创建新的 DNS 记录</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="recordType">记录类型</Label>
            <Select value={recordType} onValueChange={setRecordType}>
              <SelectTrigger id="recordType" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="AAAA">AAAA</SelectItem>
                <SelectItem value="CNAME">CNAME</SelectItem>
                <SelectItem value="TXT">TXT</SelectItem>
                <SelectItem value="MX">MX</SelectItem>
                <SelectItem value="NS">NS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="recordName">名称</Label>
            <Input
              id="recordName"
              value={recordName}
              onChange={(e) => setRecordName(e.target.value)}
              placeholder="例如: www 或 @ 或完整域名"
              className="mt-1.5"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="recordContent">内容</Label>
          <Input
            id="recordContent"
            value={recordContent}
            onChange={(e) => setRecordContent(e.target.value)}
            placeholder={
              recordType === "A" ? "例如: 192.168.1.1" :
              recordType === "CNAME" ? "例如: example.com" :
              recordType === "TXT" ? "文本内容" :
              "记录内容"
            }
            className="mt-1.5"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
            <Label htmlFor="proxied" className="cursor-pointer">
              启用 Cloudflare 代理
            </Label>
            <Switch
              id="proxied"
              checked={proxied}
              onCheckedChange={setProxied}
            />
          </div>

          <div>
            <Label htmlFor="ttl">TTL (秒)</Label>
            <Select value={ttl} onValueChange={setTtl}>
              <SelectTrigger id="ttl" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">自动</SelectItem>
                <SelectItem value="120">2 分钟</SelectItem>
                <SelectItem value="300">5 分钟</SelectItem>
                <SelectItem value="600">10 分钟</SelectItem>
                <SelectItem value="3600">1 小时</SelectItem>
                <SelectItem value="86400">1 天</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                创建中...
              </>
            ) : (
              "创建记录"
            )}
          </Button>
          <Button
            onClick={resetForm}
            variant="outline"
            disabled={isSubmitting}
          >
            取消
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AddDNSRecordForm;
