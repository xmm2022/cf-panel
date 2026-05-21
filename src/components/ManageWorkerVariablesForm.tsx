import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { invokeWorkerApi } from "@/lib/cloudflare-worker-api";

interface ManageWorkerVariablesFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workerId: string;
  workerName: string;
  accountId: string;
  email: string;
  apiKey: string;
  onSuccess: () => void;
}

interface Variable {
  name: string;
  value: string;
  type: 'plain_text' | 'secret_text' | 'json';
  isExisting?: boolean; // 标记是否为已存在的变量（从服务器获取）
}

export function ManageWorkerVariablesForm({ open, onOpenChange, workerId, workerName, accountId, email, apiKey, onSuccess }: ManageWorkerVariablesFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [variables, setVariables] = useState<Variable[]>([]);

  useEffect(() => {
    if (open) {
      fetchVariables();
    }
  }, [open]);

  const fetchVariables = async () => {
    setIsFetching(true);

    try {
      const { data, error } = await invokeWorkerApi('cloudflare-api', {
        action: 'get_worker_settings',
        email,
        apiKey,
        accountId,
        scriptName: workerId,
      });

      if (error) throw error;

      if (data.success && data.result) {
        // Cloudflare API 可能返回两种结构：
        // 1. { result: { bindings: [...] } }
        // 2. { result: [...] } (直接是 bindings 数组)
        let bindings = [];
        if (Array.isArray(data.result)) {
          bindings = data.result;
        } else if (data.result.bindings && Array.isArray(data.result.bindings)) {
          bindings = data.result.bindings;
        }
        
        const plainVars = bindings.filter((b: any) => b.type === 'plain_text');
        const secretVars = bindings.filter((b: any) => b.type === 'secret_text');
        const jsonVars = bindings.filter((b: any) => b.type === 'json');
        console.log('Fetched environment variables:', { plain: plainVars, secret: secretVars.map((s:any)=>s.name), json: jsonVars });
        setVariables([
          ...plainVars.map((v: any): Variable => ({ name: v.name, value: v.text || '', type: 'plain_text', isExisting: true })),
          ...secretVars.map((v: any): Variable => ({ name: v.name, value: '', type: 'secret_text', isExisting: true })),
          ...jsonVars.map((v: any): Variable => ({ name: v.name, value: v.json ? JSON.stringify(v.json, null, 2) : '', type: 'json', isExisting: true })),
        ]);
      }
    } catch (error: any) {
      console.error('Fetch variables error:', error);
      toast({
        title: "获取环境变量失败",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsFetching(false);
    }
  };

  const addVariable = () => {
    setVariables([...variables, { name: '', value: '', type: 'plain_text', isExisting: false }]);
  };

  const removeVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const updateVariable = (index: number, field: 'name' | 'value', value: string) => {
    const newVariables = [...variables];
    newVariables[index][field] = value;
    setVariables(newVariables);
  };

  const updateVariableType = (index: number, type: 'plain_text' | 'secret_text' | 'json') => {
    const newVariables = [...variables];
    newVariables[index].type = type;
    // JSON 类型时，如果值为空则初始化为 {}
    if (type === 'json' && !newVariables[index].value) {
      newVariables[index].value = '{}';
    }
    setVariables(newVariables);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证变量名不为空
    const emptyNames = variables.filter(v => !v.name.trim());
    if (emptyNames.length > 0) {
      toast({
        title: "错误",
        description: "变量名不能为空",
        variant: "destructive",
      });
      return;
    }

    // 检查重复的变量名
    const names = variables.map(v => v.name);
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicates.length > 0) {
      toast({
        title: "错误",
        description: `变量名重复: ${duplicates.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await invokeWorkerApi('cloudflare-api', {
        action: 'update_worker_variables',
        email,
        apiKey,
        accountId,
        scriptName: workerId,
        data: {
          variables: variables
            .filter(v => !v.isExisting || v.type !== 'secret_text') // 排除已存在的密钥
            .map(v => {
              if (v.type === 'json') {
                try {
                  return { name: v.name, value: JSON.parse(v.value), type: 'json' };
                } catch {
                  throw new Error(`变量 ${v.name} 的 JSON 格式无效`);
                }
              }
              return { name: v.name, value: v.value, type: v.type };
            }),
          keepSecrets: variables
            .filter(v => v.type === 'secret_text' && v.isExisting) // 只保留已存在的密钥
            .map(v => v.name),
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "成功",
          description: `Worker "${workerName}" 的环境变量已更新`,
        });
        onSuccess();
        onOpenChange(false);
      } else {
        throw new Error(data.errors?.[0]?.message || "更新环境变量失败");
      }
    } catch (error: any) {
      console.error('Update variables error:', error);
      toast({
        title: "更新环境变量失败",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>管理环境变量</DialogTitle>
          <DialogDescription>
            为 Worker "{workerName}" 配置环境变量
            <br />
            <span className="text-sm text-muted-foreground">密钥类型会加密保存为 secret_text；已存在的密钥只显示名称无法查看值。</span>
          </DialogDescription>
        </DialogHeader>

        {isFetching ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              {variables.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  暂无环境变量，点击下方按钮添加
                </p>
              ) : (
                variables.map((variable, index) => (
                  <div key={index} className="space-y-2 p-4 border rounded-lg">
                    <div className="flex gap-2 items-start">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground mb-1">变量名</Label>
                        <Input
                          placeholder="例如: API_KEY"
                          value={variable.name}
                          onChange={(e) => updateVariable(index, 'name', e.target.value.toUpperCase())}
                          disabled={isLoading}
                        />
                        {variable.type === 'secret_text' && variable.isExisting && (
                          <p className="text-xs text-muted-foreground mt-1">已存在的密钥，仅显示名称</p>
                        )}
                      </div>
                      <div className="w-32">
                        <Label className="text-xs text-muted-foreground mb-1">类型</Label>
                        <Select
                          value={variable.type}
                          onValueChange={(value: any) => updateVariableType(index, value)}
                          disabled={isLoading}
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            <SelectItem value="plain_text">文本</SelectItem>
                            <SelectItem value="secret_text">密钥</SelectItem>
                            <SelectItem value="json">JSON</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="pt-6">
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => removeVariable(index)}
                          disabled={isLoading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1">变量值</Label>
                      {variable.type === 'json' ? (
                        <Textarea
                          placeholder='{"key": "value"}'
                          value={variable.value}
                          onChange={(e) => updateVariable(index, 'value', e.target.value)}
                          disabled={isLoading}
                          rows={4}
                          className="font-mono text-sm"
                        />
                      ) : (
                        <>
                          <Input
                            placeholder={variable.type === 'secret_text' && variable.isExisting ? "********（已设置，无法查看）" : "输入变量值"}
                            value={variable.value}
                            onChange={(e) => updateVariable(index, 'value', e.target.value)}
                            disabled={isLoading || (variable.type === 'secret_text' && variable.isExisting)}
                          />
                          {variable.type === 'secret_text' && variable.isExisting && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                              ⚠️ 已存在的密钥无法修改，删除此项将移除密钥
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={addVariable}
              disabled={isLoading}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              添加变量
            </Button>

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
                保存
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
