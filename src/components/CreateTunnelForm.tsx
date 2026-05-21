import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CreateTunnelFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  email: string;
  apiKey: string;
  onSuccess: () => void;
}

export function CreateTunnelForm({
  open,
  onOpenChange,
}: CreateTunnelFormProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>创建新的 Tunnel</DialogTitle>
          <DialogDescription>
            通过 Cloudflare Dashboard 创建 Tunnel
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <p className="text-sm">
              由于API限制，Tunnel 需要通过 Cloudflare Dashboard 创建。
            </p>
            <div className="space-y-2 text-sm">
              <p className="font-medium">创建步骤：</p>
              <ol className="list-decimal list-inside space-y-1 ml-2 text-muted-foreground">
                <li>访问 Cloudflare Dashboard</li>
                <li>进入 Zero Trust → Networks → Tunnels</li>
                <li>点击 "Create a tunnel" 按钮</li>
                <li>输入隧道名称并完成配置</li>
                <li>返回此页面点击"刷新"按钮查看新建的隧道</li>
              </ol>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            知道了
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
