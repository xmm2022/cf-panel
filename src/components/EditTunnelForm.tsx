import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EditTunnelFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tunnel: any;
  accountId: string;
  email: string;
  apiKey: string;
  onSuccess: () => void;
}

export function EditTunnelForm({
  open,
  onOpenChange,
  tunnel,
}: EditTunnelFormProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑 Tunnel</DialogTitle>
          <DialogDescription>
            通过 Cloudflare Dashboard 编辑 Tunnel
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Tunnel ID</Label>
            <Input value={tunnel?.id || ""} disabled className="bg-muted font-mono text-xs" />
          </div>
          <div className="space-y-2">
            <Label>当前名称</Label>
            <Input value={tunnel?.name || ""} disabled className="bg-muted" />
          </div>
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <p className="text-sm">
              由于API限制，Tunnel 名称需要通过 Cloudflare Dashboard 修改。
            </p>
            <div className="space-y-2 text-sm">
              <p className="font-medium">修改步骤：</p>
              <ol className="list-decimal list-inside space-y-1 ml-2 text-muted-foreground">
                <li>访问 Cloudflare Dashboard</li>
                <li>进入 Zero Trust → Networks → Tunnels</li>
                <li>找到名为 "{tunnel?.name}" 的隧道</li>
                <li>点击隧道名称进入详情页</li>
                <li>在设置中修改隧道名称</li>
                <li>返回此页面点击"刷新"按钮查看更新</li>
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
