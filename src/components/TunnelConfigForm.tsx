import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase-adapter";
import { Loader2, Copy, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface TunnelConfigFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tunnel: TunnelInfo;
  accountId: string;
  email: string;
  apiKey: string;
}

interface TunnelInfo {
  id: string;
  name: string;
  status?: string;
}

interface TunnelConfigResponse {
  success: boolean;
  config?: string;
  token?: string;
  error?: string;
  errors?: Array<{ message: string }>;
}

export function TunnelConfigForm({
  open,
  onOpenChange,
  tunnel,
  accountId,
  email,
  apiKey,
}: TunnelConfigFormProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!open || !tunnel) return;

    void (async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke<TunnelConfigResponse>('cloudflare-api', {
          body: {
            action: 'get_tunnel_config',
            email,
            apiKey,
            accountId,
            tunnelId: tunnel.id,
          }
        });

        if (error) throw error;

        if (data?.success) {
          setConfig(data.config || "");
          setToken(data.token || "");
        } else if (data?.error?.includes('未知操作')) {
          setConfig(generateConfigTemplate());
          toast({
            title: "无法自动获取配置",
            description: "已生成配置模板，请根据需要修改",
            variant: "default",
          });
        } else {
          throw new Error(data?.errors?.[0]?.message || data?.error || '加载配置失败');
        }
      } catch (error) {
        console.error('Load tunnel config error:', error);
        setConfig(generateConfigTemplate());
        toast({
          title: "无法自动获取配置",
          description: "已生成配置模板，请根据需要修改",
          variant: "default",
        });
      } finally {
        setIsLoading(false);
      }
    })();
  }, [open, tunnel, accountId, email, apiKey, toast]);

  const generateConfigTemplate = () => {
    return `# Cloudflare Tunnel 配置文件
# Tunnel ID: ${tunnel.id}
# Tunnel Name: ${tunnel.name}

tunnel: ${tunnel.id}
credentials-file: /root/.cloudflared/${tunnel.id}.json

# 入站规则 - 配置你的服务
ingress:
  # 示例：将域名映射到本地服务
  - hostname: example.com
    service: http://localhost:8080
  
  # 示例：HTTPS服务
  - hostname: secure.example.com
    service: https://localhost:8443
  
  # 示例：SSH服务
  - hostname: ssh.example.com
    service: ssh://localhost:22
  
  # 捕获所有其他请求（必须）
  - service: http_status:404

# 可选：日志配置
loglevel: info

# 注意事项：
# 1. 将 example.com 替换为你的实际域名
# 2. credentials-file 路径需要包含有效的凭证文件
# 3. 确保DNS记录指向此tunnel`;
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(token);
    toast({
      title: "已复制",
      description: "Tunnel Token 已复制到剪贴板",
    });
  };

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(config);
    toast({
      title: "已复制",
      description: "配置已复制到剪贴板",
    });
  };

  const handleDownloadConfig = () => {
    const blob = new Blob([config], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tunnel-${tunnel.name}-config.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "配置已下载",
      description: "配置文件已保存到本地",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tunnel 配置</DialogTitle>
          <DialogDescription>
            {tunnel?.name} 的配置信息和 Token
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tunnel 信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tunnel ID:</span>
                  <code className="bg-muted px-2 py-1 rounded text-xs">{tunnel.id}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">名称:</span>
                  <span>{tunnel.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">状态:</span>
                  <span>{tunnel.status || 'inactive'}</span>
                </div>
              </CardContent>
            </Card>

            {token && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tunnel Token</CardTitle>
                  <CardDescription>
                    使用此 Token 连接 cloudflared 客户端
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Textarea
                      value={token}
                      readOnly
                      className="font-mono text-xs bg-muted"
                      rows={3}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyToken}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    运行命令: cloudflared tunnel run --token {token.substring(0, 20)}...
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>配置文件 (YAML)</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyConfig}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    复制
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadConfig}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    下载
                  </Button>
                </div>
              </div>
              <Textarea
                value={config}
                onChange={(e) => setConfig(e.target.value)}
                className="font-mono text-xs"
                rows={15}
                placeholder="tunnel: your-tunnel-id&#10;credentials-file: /path/to/credentials.json&#10;ingress:&#10;  - hostname: example.com&#10;    service: http://localhost:8080&#10;  - service: http_status:404"
              />
            </div>

            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-sm">使用说明</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                <div className="space-y-2">
                  <p className="font-medium">方式一：使用Token（推荐）</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>从 Cloudflare Dashboard 获取 Tunnel Token</li>
                    <li>运行: <code className="bg-background px-1 rounded">cloudflared tunnel run --token YOUR_TOKEN</code></li>
                  </ol>
                </div>
                <div className="space-y-2 pt-2">
                  <p className="font-medium">方式二：使用配置文件</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>安装 cloudflared: <code className="bg-background px-1 rounded">brew install cloudflare/cloudflare/cloudflared</code></li>
                    <li>修改上方配置文件中的域名和服务地址</li>
                    <li>保存配置为 config.yaml</li>
                    <li>登录 Cloudflare: <code className="bg-background px-1 rounded">cloudflared tunnel login</code></li>
                    <li>从 <code className="bg-background px-1 rounded">~/.cloudflared/</code> 复制凭证文件</li>
                    <li>运行: <code className="bg-background px-1 rounded">cloudflared tunnel --config config.yaml run {tunnel.name}</code></li>
                  </ol>
                </div>
                <div className="pt-2 border-t border-border/30">
                  <p className="text-yellow-600 dark:text-yellow-500">
                    ⚠️ Token 和凭证文件需要从 Cloudflare Dashboard 获取
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
