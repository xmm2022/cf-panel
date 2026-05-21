import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, Globe, Server, Terminal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface TunnelRouteFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tunnel: any;
  accountId: string;
  email: string;
  apiKey: string;
  onSuccess: () => void;
}

export function TunnelRouteForm({
  open,
  onOpenChange,
  tunnel,
}: TunnelRouteFormProps) {
  const { toast } = useToast();
  const [hostname, setHostname] = useState("app.example.com");
  const [service, setService] = useState("http://localhost:3000");

  const generateConfig = () => {
    return `tunnel: ${tunnel?.id}
credentials-file: /path/to/.cloudflared/${tunnel?.id}.json

ingress:
  - hostname: ${hostname}
    service: ${service}
  # 添加更多路由
  # - hostname: api.example.com
  #   service: http://localhost:8080
  # - hostname: ssh.example.com
  #   service: ssh://localhost:22
  # 捕获所有其他请求
  - service: http_status:404`;
  };

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(generateConfig());
    toast({
      title: "已复制",
      description: "配置已复制到剪贴板",
    });
  };

  const handleCopyDNSCommand = () => {
    const dnsCommand = `# 在 DNS 中添加 CNAME 记录
# 将 ${hostname} 指向: ${tunnel?.id}.cfargotunnel.com`;
    navigator.clipboard.writeText(dnsCommand);
    toast({
      title: "已复制",
      description: "DNS 配置命令已复制到剪贴板",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>配置应用程序路由</DialogTitle>
          <DialogDescription>
            为 {tunnel?.name} 配置公开访问的应用程序路由
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 路由配置生成器 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">路由配置生成器</CardTitle>
              <CardDescription>输入域名和服务地址生成配置</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hostname">
                    <Globe className="w-4 h-4 inline mr-1" />
                    域名 (Hostname)
                  </Label>
                  <Input
                    id="hostname"
                    placeholder="app.example.com"
                    value={hostname}
                    onChange={(e) => setHostname(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service">
                    <Server className="w-4 h-4 inline mr-1" />
                    后端服务 (Service)
                  </Label>
                  <Input
                    id="service"
                    placeholder="http://localhost:3000"
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 生成的配置 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">生成的配置文件</CardTitle>
                <Button variant="outline" size="sm" onClick={handleCopyConfig}>
                  <Copy className="w-4 h-4 mr-2" />
                  复制配置
                </Button>
              </div>
              <CardDescription>将此配置保存为 config.yaml</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={generateConfig()}
                readOnly
                className="font-mono text-xs"
                rows={12}
              />
            </CardContent>
          </Card>

          {/* DNS 配置 */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">DNS 配置</CardTitle>
                <Button variant="outline" size="sm" onClick={handleCopyDNSCommand}>
                  <Copy className="w-4 h-4 mr-2" />
                  复制
                </Button>
              </div>
              <CardDescription>在域名管理中添加以下 DNS 记录</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="p-3 bg-background rounded-md border">
                <p className="text-sm font-medium mb-1">类型: CNAME</p>
                <p className="text-sm text-muted-foreground">名称: <code className="bg-muted px-1 rounded">{hostname}</code></p>
                <p className="text-sm text-muted-foreground">目标: <code className="bg-muted px-1 rounded">{tunnel?.id}.cfargotunnel.com</code></p>
              </div>
            </CardContent>
          </Card>

          {/* 使用步骤 */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-sm">
                <Terminal className="w-4 h-4 inline mr-2" />
                配置步骤
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div className="space-y-2">
                <p className="font-medium">1. 保存配置文件</p>
                <p className="text-muted-foreground ml-4">将上方生成的配置保存为 <code className="bg-background px-1 rounded">config.yaml</code></p>
              </div>
              
              <div className="space-y-2">
                <p className="font-medium">2. 配置 DNS</p>
                <p className="text-muted-foreground ml-4">在您的 DNS 提供商处添加 CNAME 记录</p>
              </div>
              
              <div className="space-y-2">
                <p className="font-medium">3. 启动 Tunnel</p>
                <div className="ml-4 p-2 bg-background rounded border">
                  <code className="text-xs">cloudflared tunnel --config config.yaml run {tunnel?.name}</code>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <p className="font-medium text-xs text-muted-foreground">常用服务示例：</p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-xs text-muted-foreground">
                  <li>Web 应用: <code className="bg-background px-1 rounded">http://localhost:3000</code></li>
                  <li>API 服务: <code className="bg-background px-1 rounded">http://localhost:8080</code></li>
                  <li>SSH 访问: <code className="bg-background px-1 rounded">ssh://localhost:22</code></li>
                  <li>RDP 远程桌面: <code className="bg-background px-1 rounded">rdp://localhost:3389</code></li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
