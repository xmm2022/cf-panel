import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { invokeWorkerApi } from "@/lib/cloudflare-worker-api";

interface BindKVNamespaceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workerId: string;
  workerName: string;
  accountId: string;
  email: string;
  apiKey: string;
  onSuccess: () => void;
}

interface KVNamespace {
  id: string;
  title: string;
}

export function BindKVNamespaceForm({ open, onOpenChange, workerId, workerName, accountId, email, apiKey, onSuccess }: BindKVNamespaceFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingNamespaces, setIsFetchingNamespaces] = useState(false);
  const [namespaces, setNamespaces] = useState<KVNamespace[]>([]);
  const [selectedNamespace, setSelectedNamespace] = useState("");
  const [bindingName, setBindingName] = useState("MY_KV");

  useEffect(() => {
    if (open) {
      fetchKVNamespaces();
    }
  }, [open]);

  const fetchKVNamespaces = async () => {
    setIsFetchingNamespaces(true);

    try {
      const { data, error } = await invokeWorkerApi('cloudflare-api', {
        action: 'list_kv_namespaces',
        email,
        apiKey,
        accountId,
      });

      if (error) throw error;

      if (data.success) {
        setNamespaces(data.result || []);
      } else {
        throw new Error(data.errors?.[0]?.message || "获取KV命名空间列表失败");
      }
    } catch (error: any) {
      console.error('Fetch KV namespaces error:', error);
      toast({
        title: "获取KV命名空间列表失败",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsFetchingNamespaces(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedNamespace) {
      toast({
        title: "错误",
        description: "请选择要绑定的KV命名空间",
        variant: "destructive",
      });
      return;
    }

    if (!bindingName.trim()) {
      toast({
        title: "错误",
        description: "请输入绑定名称",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await invokeWorkerApi('cloudflare-api', {
        action: 'bind_kv_to_worker',
        email,
        apiKey,
        accountId,
        scriptName: workerId,
        data: {
          namespace_id: selectedNamespace,
          binding_name: bindingName,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "成功",
          description: `KV 命名空间已绑定到 Worker "${workerName}"`,
        });
        onSuccess();
        onOpenChange(false);
      } else {
        throw new Error(data.errors?.[0]?.message || "绑定KV命名空间失败");
      }
    } catch (error: any) {
      console.error('Bind KV namespace error:', error);
      toast({
        title: "绑定KV命名空间失败",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>绑定 KV 命名空间</DialogTitle>
          <DialogDescription>
            将KV命名空间绑定到 Worker: {workerName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="namespace">KV 命名空间</Label>
            {isFetchingNamespaces ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : namespaces.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                没有可用的KV命名空间，请先创建一个
              </p>
            ) : (
              <Select value={selectedNamespace} onValueChange={setSelectedNamespace} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="选择KV命名空间" />
                </SelectTrigger>
                <SelectContent>
                  {namespaces.map((ns) => (
                    <SelectItem key={ns.id} value={ns.id}>
                      {ns.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="binding-name">绑定名称</Label>
            <Input
              id="binding-name"
              value={bindingName}
              onChange={(e) => setBindingName(e.target.value.toUpperCase())}
              placeholder="MY_KV"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              在Worker代码中使用 env.{bindingName} 访问KV存储
            </p>
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
            <Button type="submit" disabled={isLoading || namespaces.length === 0}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              绑定
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
