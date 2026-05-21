import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Shield } from "lucide-react";
import { toast } from "sonner";

interface VerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
}

const VERIFY_API_URL = "https://yanzhen.feria.eu.org/api/site_access/verify";

export function VerificationDialog({
  open,
  onOpenChange,
  onVerified,
}: VerificationDialogProps) {
  const [password, setPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    if (!password.trim()) {
      toast.error("请输入授权码");
      return;
    }

    setIsVerifying(true);

    try {
      const response = await fetch(VERIFY_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "验证失败");
        return;
      }

      // 验证成功
      toast.success("验证成功");
      onOpenChange(false);
      setPassword("");
      onVerified();
    } catch (error) {
      console.error("Verification error:", error);
      toast.error("验证请求失败，请检查网络连接");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isVerifying) {
      handleVerify();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            安全验证
          </DialogTitle>
          <DialogDescription>
            请输入授权码以继续部署加速配置
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="verification-password">授权码</Label>
            <Input
              id="verification-password"
              type="password"
              placeholder="请输入授权码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isVerifying}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-3">
          <div className="flex-1 text-xs text-muted-foreground">
            获取授权码请联系{" "}
            <a
              href="https://t.me/Feria5"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              @Feria5
            </a>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setPassword("");
              }}
              disabled={isVerifying}
            >
              取消
            </Button>
            <Button onClick={handleVerify} disabled={isVerifying}>
              {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              验证
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
