import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { getCurrentAccount } from "@/lib/accounts-storage";
import { invokeProviderApi } from "@/lib/cloudflare-worker-api";

interface CreateD1DatabaseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  apiKey: string;
  accountId: string;
  onSuccess: () => void;
}

interface CreateD1DatabaseRequest {
  action: "create_d1_database";
  accountId: string;
  name: string;
  primary_location_hint?: string;
  jurisdiction?: string;
}

interface CloudflareApiError {
  message: string;
}

interface CreateD1DatabaseResponse {
  success?: boolean;
  error?: string;
  errors?: CloudflareApiError[];
}

export function CreateD1DatabaseForm({
  open,
  onOpenChange,
  email,
  apiKey,
  accountId,
  onSuccess,
}: CreateD1DatabaseFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [databaseName, setDatabaseName] = useState("");
  const [primaryLocationHint, setPrimaryLocationHint] = useState<string>("apac");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const rawName = databaseName.trim().toLowerCase();
    // 仅允许小写字母、数字和连字符
    const sanitizedName = rawName.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$|_/g, "");

    if (!sanitizedName) {
      toast({
        title: "请输入有效的数据库名称",
        description: "仅允许小写字母、数字和连字符",
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

      const baseBody: CreateD1DatabaseRequest = {
        action: "create_d1_database",
        accountId,
        name: sanitizedName,
      };

      // 多策略重试：兼容不同后端/Cloudflare API 期望的参数
      const strategies = [
        { label: "hint+juris (selected)", hint: primaryLocationHint || "auto", includeHint: true, includeJuris: true },
        { label: "hint:auto", hint: "auto", includeHint: true, includeJuris: false },
        { label: "no hint", includeHint: false, includeJuris: false },
        { label: "hint+juris apac", hint: "apac", includeHint: true, includeJuris: true },
      ];

      let lastErrorMsg: string | undefined;
      let lastData: CreateD1DatabaseResponse | null = null;

      for (const s of strategies) {
        const body: CreateD1DatabaseRequest = { ...baseBody };
        if (s.includeHint) {
          body.primary_location_hint = s.hint;
        }
        if (s.includeJuris) {
          body.jurisdiction = s.hint; // 兼容旧实现
        }

        console.log("=== D1 Create Attempt ===", s.label, body);
        const wf = await invokeProviderApi<CreateD1DatabaseResponse>("auto", body, currentAccount.credentials);
        const data = wf.data;
        const error = wf.error;
        console.log("Attempt Response:", { error, data });

        if (error) {
          lastErrorMsg = error.message;
          lastData = data;
        } else if (data?.success) {
          console.log("✅ D1 database created successfully via:", s.label);
          toast({
            title: "数据库创建成功",
            description: `D1 数据库 "${sanitizedName}" 已创建`,
          });
          setDatabaseName("");
          setPrimaryLocationHint("apac");
          onSuccess();
          onOpenChange(false);
          return;
        } else {
          lastErrorMsg = data?.errors?.[0]?.message || data?.error || "创建失败";
          lastData = data;
          console.warn("Create failed on strategy:", s.label, lastErrorMsg);
        }
      }

      // 如果走到这里，说明所有策略均失败
      console.error("❌ D1 database creation failed after retries:", lastErrorMsg, lastData);
      throw new Error(lastErrorMsg || "创建失败");
    } catch (error) {
      console.error("=== D1 Database Creation Failed ===");
      console.error("Error details:", error);
      
      let errorMessage = "无法创建数据库";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "创建失败",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>创建 D1 数据库</DialogTitle>
          <DialogDescription>
            创建一个新的 Cloudflare D1 SQL 数据库实例
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="database-name">数据库名称</Label>
              <Input
                id="database-name"
                placeholder="my-database"
                value={databaseName}
                onChange={(e) => setDatabaseName(e.target.value)}
                disabled={isLoading}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                只能包含小写字母、数字和连字符
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="primary-location-hint">数据库位置</Label>
              <Select
                value={primaryLocationHint}
                onValueChange={setPrimaryLocationHint}
                disabled={isLoading}
              >
                <SelectTrigger id="primary-location-hint">
                  <SelectValue placeholder="选择数据库位置" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apac">亚太地区 (APAC) - 推荐</SelectItem>
                  <SelectItem value="wnam">北美洲西部 (WNAM)</SelectItem>
                  <SelectItem value="enam">北美洲东部 (ENAM)</SelectItem>
                  <SelectItem value="weur">西欧 (WEUR)</SelectItem>
                  <SelectItem value="eeur">东欧 (EEUR)</SelectItem>
                  <SelectItem value="oc">大洋洲 (OC)</SelectItem>
                  <SelectItem value="auto">自动</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                选择数据存储的地理位置以符合合规要求
              </p>
            </div>
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
              {isLoading ? "创建中..." : "创建数据库"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
