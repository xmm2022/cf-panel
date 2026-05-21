import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { invokeWorkerApi } from "@/lib/cloudflare-worker-api";

interface BindR2BucketFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workerId: string;
  workerName: string;
  accountId: string;
  email: string;
  apiKey: string;
  onSuccess: () => void;
}

interface R2Bucket {
  name: string;
  creation_date: string;
}

export function BindR2BucketForm({ open, onOpenChange, workerId, workerName, accountId, email, apiKey, onSuccess }: BindR2BucketFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingBuckets, setIsFetchingBuckets] = useState(false);
  const [buckets, setBuckets] = useState<R2Bucket[]>([]);
  const [selectedBucket, setSelectedBucket] = useState("");
  const [bindingName, setBindingName] = useState("MY_BUCKET");

  useEffect(() => {
    if (open) {
      fetchR2Buckets();
    }
  }, [open]);

  const fetchR2Buckets = async () => {
    setIsFetchingBuckets(true);

    try {
      const { data, error } = await invokeWorkerApi('cloudflare-api', {
        action: 'list_r2_buckets',
        email,
        apiKey,
        accountId,
      });

      if (error) throw error;

      if (data.success) {
        setBuckets(data.result?.buckets || []);
      } else {
        throw new Error(data.errors?.[0]?.message || "获取R2存储桶列表失败");
      }
    } catch (error: any) {
      console.error('Fetch R2 buckets error:', error);
      toast({
        title: "获取R2存储桶列表失败",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsFetchingBuckets(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBucket) {
      toast({
        title: "错误",
        description: "请选择要绑定的R2存储桶",
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
        action: 'bind_r2_to_worker',
        email,
        apiKey,
        accountId,
        scriptName: workerId,
        data: {
          bucket_name: selectedBucket,
          binding_name: bindingName,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "成功",
          description: `R2 存储桶已绑定到 Worker "${workerName}"`,
        });
        onSuccess();
        onOpenChange(false);
      } else {
        throw new Error(data.errors?.[0]?.message || "绑定R2存储桶失败");
      }
    } catch (error: any) {
      console.error('Bind R2 bucket error:', error);
      toast({
        title: "绑定R2存储桶失败",
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
          <DialogTitle>绑定 R2 存储桶</DialogTitle>
          <DialogDescription>
            将R2存储桶绑定到 Worker: {workerName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bucket">R2 存储桶</Label>
            {isFetchingBuckets ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : buckets.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                没有可用的R2存储桶，请先创建一个
              </p>
            ) : (
              <Select value={selectedBucket} onValueChange={setSelectedBucket} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="选择R2存储桶" />
                </SelectTrigger>
                <SelectContent>
                  {buckets.map((bucket) => (
                    <SelectItem key={bucket.name} value={bucket.name}>
                      {bucket.name}
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
              placeholder="MY_BUCKET"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              在Worker代码中使用 env.{bindingName} 访问存储桶
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
            <Button type="submit" disabled={isLoading || buckets.length === 0}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              绑定
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
