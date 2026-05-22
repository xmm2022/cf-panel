import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCurrentAccount } from "@/lib/accounts-storage";
import { invokeProviderApi } from "@/lib/cloudflare-worker-api";
import { recordOperation } from "@/lib/operation-logger";

interface CreateWorkerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  email: string;
  apiKey: string;
  onSuccess: () => void;
}

interface UploadWorkerResponse {
  success: boolean;
  errors?: Array<{ message: string }>;
}

interface WorkersSubdomainResponse {
  result?: {
    subdomain?: string;
  };
}

const DEFAULT_WORKER_SCRIPT = `addEventListener('fetch', event => {
  event.respondWith(new Response('Hello World!'));
});`;

export function CreateWorkerForm({ open, onOpenChange, accountId, email, apiKey, onSuccess }: CreateWorkerFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [workerName, setWorkerName] = useState("");
  const [workerScript, setWorkerScript] = useState(DEFAULT_WORKER_SCRIPT);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!workerName.trim()) {
      toast({
        title: "错误",
        description: "请输入Worker名称",
        variant: "destructive",
      });
      return;
    }

    // 验证Worker名称格式（只允许字母、数字、连字符）
    if (!/^[a-z0-9-]+$/.test(workerName)) {
      toast({
        title: "错误",
        description: "Worker名称只能包含小写字母、数字和连字符",
        variant: "destructive",
      });
      return;
    }

    if (!workerScript.trim()) {
      toast({
        title: "错误",
        description: "Worker脚本不能为空",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const currentAccount = getCurrentAccount();
      if (!currentAccount || currentAccount.provider !== "cloudflare") {
        toast({
          title: "缺少凭据",
          description: "请先登录 Cloudflare 账号",
          variant: "destructive",
        });
        return;
      }

      // 1️⃣ 创建 Worker
      const { data, error } = await invokeProviderApi<UploadWorkerResponse>("auto", {
        action: 'upload_worker',
        accountId,
        scriptName: workerName,
        data: {
          script: workerScript,
        },
      }, currentAccount.credentials);

      if (error) throw error;

      if (data?.success) {
        // 2️⃣ 获取 workers.dev 子域名并构建访问链接
        let visitUrl: string | null = null;
        try {
          const { data: subData } = await invokeProviderApi<WorkersSubdomainResponse>("auto", {
            action: 'get_workers_subdomain',
            accountId,
          }, currentAccount.credentials);
          const subdomain = subData?.result?.subdomain;
          if (subdomain) {
            visitUrl = `https://${workerName}.${subdomain}.workers.dev`;
          }
        } catch (e) {
          console.warn('获取 workers.dev 子域失败:', e);
        }

        toast({
          title: "成功",
          description: visitUrl
            ? `Worker "${workerName}" 创建成功，可访问：${visitUrl}`
            : `Worker "${workerName}" 创建成功。若 Cloudflare 显示“非活动”，表示未绑定到域，但已可通过 workers.dev 访问。`,
        });
        
        // 记录操作历史
        recordOperation({
          userId: email,
          operationType: 'create',
          resourceType: 'worker',
          resourceName: workerName,
          actionDetails: visitUrl
            ? `创建 Worker: ${workerName}（访问 ${visitUrl}）`
            : `创建 Worker: ${workerName}`,
        });
        
        setWorkerName("");
        setWorkerScript(DEFAULT_WORKER_SCRIPT);
        onSuccess();
        onOpenChange(false);
      } else {
        throw new Error(data?.errors?.[0]?.message || "创建Worker失败");
      }
    } catch (error) {
      console.error('Create worker error:', error);
      toast({
        title: "创建Worker失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新建 Worker</DialogTitle>
          <DialogDescription>
            创建一个新的 Cloudflare Worker 脚本
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="worker-name">Worker 名称</Label>
            <Input
              id="worker-name"
              value={workerName}
              onChange={(e) => setWorkerName(e.target.value.toLowerCase())}
              placeholder="my-worker"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              只能包含小写字母、数字和连字符
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="worker-script">Worker 脚本代码</Label>
            <Textarea
              id="worker-script"
              value={workerScript}
              onChange={(e) => setWorkerScript(e.target.value)}
              placeholder="addEventListener('fetch', event => { /* ... */ })"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              创建 Worker
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
