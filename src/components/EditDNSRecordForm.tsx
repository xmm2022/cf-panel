import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { getCookie } from "@/lib/cookies";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase-adapter";
import { recordOperation } from "@/lib/operation-logger";

interface DNSRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied: boolean;
  ttl: number;
}

interface EditDNSRecordFormProps {
  record: DNSRecord;
  zoneId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  cfEmail?: string;
  cfApiKey?: string;
}

const EditDNSRecordForm = ({ record, zoneId, open, onOpenChange, onSuccess, cfEmail: propEmail, cfApiKey: propApiKey }: EditDNSRecordFormProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [recordType, setRecordType] = useState(record.type);
  const [recordName, setRecordName] = useState(record.name);
  const [recordContent, setRecordContent] = useState(record.content);
  const [proxied, setProxied] = useState(record.proxied);
  const [ttl, setTtl] = useState(record.ttl.toString());

  useEffect(() => {
    setRecordType(record.type);
    setRecordName(record.name);
    setRecordContent(record.content);
    setProxied(record.proxied);
    setTtl(record.ttl.toString());
  }, [record]);

  const handleSubmit = async () => {
    if (!recordName || !recordContent) {
      alert("请填写完整的记录信息");
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
          action: 'update_dns_record',
          email,
          apiKey,
          zoneId,
          recordId: record.id,
          data: {
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
          title: "DNS 记录更新成功",
          description: `${recordType} 记录已更新`,
        });
        
        // 记录操作历史
        recordOperation({
          userId: email,
          operationType: 'update',
          resourceType: 'dns_record',
          resourceName: `${recordType} ${recordName}`,
          zoneId: zoneId,
          actionDetails: `更新 ${recordType} 记录: ${recordName}`,
        });
        
        onOpenChange(false);
        onSuccess();
      } else {
        throw new Error(data.errors?.[0]?.message || "更新失败");
      }
    } catch (error) {
      toast({
        title: "更新失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>编辑 DNS 记录</DialogTitle>
          <DialogDescription>修改 DNS 记录的配置信息</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-recordType">记录类型</Label>
              <Select value={recordType} onValueChange={setRecordType}>
                <SelectTrigger id="edit-recordType" className="mt-1.5">
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
              <Label htmlFor="edit-recordName">名称</Label>
              <Input
                id="edit-recordName"
                value={recordName}
                onChange={(e) => setRecordName(e.target.value)}
                placeholder="例如: www 或 @ 或完整域名"
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="edit-recordContent">内容</Label>
            <Input
              id="edit-recordContent"
              value={recordContent}
              onChange={(e) => setRecordContent(e.target.value)}
              placeholder="记录内容"
              className="mt-1.5"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
              <div className="flex flex-col gap-1">
                <Label htmlFor="edit-proxied" className="cursor-pointer">
                  启用 Cloudflare 代理
                </Label>
                <span className="text-xs text-muted-foreground">
                  {proxied ? "🟡 已开启小黄云" : "⚪ 仅 DNS"}
                </span>
              </div>
              <Switch
                id="edit-proxied"
                checked={proxied}
                onCheckedChange={setProxied}
              />
            </div>

            <div>
              <Label htmlFor="edit-ttl">TTL (秒)</Label>
              <Select value={ttl} onValueChange={setTtl}>
                <SelectTrigger id="edit-ttl" className="mt-1.5">
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

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  更新中...
                </>
              ) : (
                "保存修改"
              )}
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              disabled={isSubmitting}
            >
              取消
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditDNSRecordForm;
