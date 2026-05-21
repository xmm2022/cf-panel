import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { invokeWorkerApi } from "@/lib/cloudflare-worker-api";
import { getCookie } from "@/lib/cookies";

interface EditWorkerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workerId: string;
  workerName: string;
  accountId: string;
  email: string;
  apiKey: string;
  onSuccess: () => void;
  currentBindings?: Array<{
    type: string;
    name: string;
    id?: string;
  }>;
}

interface WorkerScriptResponse {
  success: boolean;
  result?: string;
  errors?: Array<{ message: string }>;
}

interface UploadWorkerResponse {
  success: boolean;
  errors?: Array<{ message: string }>;
}

export function EditWorkerForm({ open, onOpenChange, workerId, workerName, accountId, email, apiKey, onSuccess, currentBindings }: EditWorkerFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [workerScript, setWorkerScript] = useState("");

  useEffect(() => {
    if (!open || !workerId) return;

    void (async () => {
      setIsFetching(true);

      console.log('Fetching worker script:', {
        workerId,
        accountId,
        hasEmail: !!email,
        hasApiKey: !!apiKey,
        emailPrefix: email?.substring(0, 5),
      });

      if (!email || !apiKey) {
        toast({
          title: "认证错误",
          description: "缺少 Cloudflare 凭证",
          variant: "destructive",
        });
        setIsFetching(false);
        return;
      }

      try {
        const { data, error } = await invokeWorkerApi<WorkerScriptResponse>('cloudflare-api', {
          action: 'get_worker_script',
          email,
          apiKey,
          accountId,
          scriptName: workerId,
        });

        if (error) throw error;

        if (data?.success) {
          setWorkerScript(data.result || "");
        } else {
          throw new Error(data?.errors?.[0]?.message || "获取Worker脚本失败");
        }
      } catch (error) {
        console.error('Fetch worker script error:', error);
        toast({
          title: "获取Worker脚本失败",
          description: error instanceof Error ? error.message : "未知错误",
          variant: "destructive",
        });
      } finally {
        setIsFetching(false);
      }
    })();
  }, [open, workerId, accountId, email, apiKey, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!workerScript.trim()) {
      toast({
        title: "错误",
        description: "Worker脚本不能为空",
        variant: "destructive",
      });
      return;
    }

    console.log('EditWorkerForm - currentBindings:', currentBindings);
    console.log('EditWorkerForm - D1 bindings:', currentBindings?.filter(b => b.type === 'd1'));

    setIsLoading(true);

    try {
      // 排除 secret_text 类型（API 不返回值，无法重新提交）
      const bindingsToKeep = (currentBindings || []).filter(b => b.type !== 'secret_text');
      
      console.log('Uploading worker with bindings:', bindingsToKeep);

      const { data, error } = await invokeWorkerApi<UploadWorkerResponse>('cloudflare-api', {
        action: 'upload_worker',
        email,
        apiKey,
        accountId,
        scriptName: workerId,
        data: {
          script: workerScript,
          bindings: bindingsToKeep, // 明确传递 bindings
        },
      });

      if (error) throw error;

      if (data?.success) {
        console.log('Worker uploaded successfully');
        
        toast({
          title: "Worker 已更新",
          description: `代码已成功部署${bindingsToKeep.length > 0 ? `，保留了 ${bindingsToKeep.length} 个绑定` : ''}`,
        });
        
        onSuccess();
        onOpenChange(false);
      } else {
        throw new Error(data?.errors?.[0]?.message || "更新Worker失败");
      }
    } catch (error) {
      console.error('Update worker error:', error);
      toast({
        title: "更新Worker失败",
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
          <DialogTitle>编辑 Worker: {workerName}</DialogTitle>
          <DialogDescription>
            修改Worker脚本代码，保存后将自动部署到Cloudflare
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="worker-script">Worker 脚本代码</Label>
            {isFetching ? (
              <div className="flex items-center justify-center h-96 border rounded-md">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Textarea
                id="worker-script"
                value={workerScript}
                onChange={(e) => setWorkerScript(e.target.value)}
                placeholder="addEventListener('fetch', event => { /* ... */ })"
                className="font-mono text-sm min-h-96"
                disabled={isLoading}
              />
            )}
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
            <Button type="submit" disabled={isLoading || isFetching}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              保存并部署
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
