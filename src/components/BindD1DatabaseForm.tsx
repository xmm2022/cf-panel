import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { invokeWorkerApi } from "@/lib/cloudflare-worker-api";

interface BindD1DatabaseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workerId: string;
  workerName: string;
  accountId: string;
  email: string;
  apiKey: string;
  onSuccess: () => void;
}

interface D1Database {
  uuid: string;
  name: string;
  version: string;
  created_at: string;
}

export function BindD1DatabaseForm({ open, onOpenChange, workerId, workerName, accountId, email, apiKey, onSuccess }: BindD1DatabaseFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingDatabases, setIsFetchingDatabases] = useState(false);
  const [databases, setDatabases] = useState<D1Database[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState("");
  const [bindingName, setBindingName] = useState("DB");

  // 获取D1数据库列表
  useEffect(() => {
    if (open) {
      fetchD1Databases();
    }
  }, [open]);

  const fetchD1Databases = async () => {
    setIsFetchingDatabases(true);

    try {
      const { data, error } = await invokeWorkerApi('cloudflare-api', {
        action: 'list_d1_databases',
        email,
        apiKey,
        accountId,
      });

      if (error) throw error;

      if (data.success) {
        setDatabases(data.result || []);
      } else {
        throw new Error(data.errors?.[0]?.message || "获取D1数据库列表失败");
      }
    } catch (error: any) {
      console.error('Fetch D1 databases error:', error);
      toast({
        title: "获取D1数据库列表失败",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsFetchingDatabases(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDatabase) {
      toast({
        title: "错误",
        description: "请选择要绑定的D1数据库",
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
        action: 'bind_d1_to_worker',
        email,
        apiKey,
        accountId,
        scriptName: workerId,
        data: {
          database_id: selectedDatabase,
          binding_name: bindingName,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "成功",
          description: `D1 数据库已绑定到 Worker "${workerName}"`,
        });
        onSuccess();
        onOpenChange(false);
      } else {
        throw new Error(data.errors?.[0]?.message || "绑定D1数据库失败");
      }
    } catch (error: any) {
      console.error('Bind D1 database error:', error);
      toast({
        title: "绑定D1数据库失败",
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
          <DialogTitle>绑定 D1 数据库</DialogTitle>
          <DialogDescription>
            将D1数据库绑定到 Worker: {workerName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="database">D1 数据库</Label>
            {isFetchingDatabases ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : databases.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                没有可用的D1数据库，请先创建一个
              </p>
            ) : (
              <Select value={selectedDatabase} onValueChange={setSelectedDatabase} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="选择D1数据库" />
                </SelectTrigger>
                <SelectContent>
                  {databases.map((db) => (
                    <SelectItem key={db.uuid} value={db.uuid}>
                      {db.name}
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
              placeholder="DB"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              在Worker代码中使用 env.{bindingName} 访问数据库
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
            <Button type="submit" disabled={isLoading || databases.length === 0}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              绑定
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
