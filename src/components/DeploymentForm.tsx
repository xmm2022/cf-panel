import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { getCookie } from "@/lib/cookies";
import { invokeWorkerApi } from "@/lib/cloudflare-worker-api";
type DeploymentStep = "domains" | "deploy" | "complete";

interface FormData {
  targetDomain: string;
  accessDomain: string;
  optimizedDomain: string;
  cacheTtl: string;
}

interface DeploymentFormProps {
  cfEmail?: string;
  cfApiKey?: string;
}

export const DeploymentForm = ({ cfEmail, cfApiKey }: DeploymentFormProps) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<DeploymentStep>("domains");
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployProgress, setDeployProgress] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    targetDomain: "",
    accessDomain: "",
    optimizedDomain: "cdns.doon.eu.org",
    cacheTtl: "0",
  });

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateDomains = () => {
    if (!formData.targetDomain.trim()) {
      toast({
        title: "目标域名不能为空",
        description: "请输入目标域名",
        variant: "destructive",
      });
      return false;
    }
    if (!formData.accessDomain.trim()) {
      toast({
        title: "访问域名不能为空",
        description: "请输入访问域名",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleConfigComplete = () => {
    if (!validateDomains()) {
      return;
    }
    // 直接进入部署步骤（自部署版本无需授权码验证）
    setCurrentStep("deploy");
  };

  const deployWorker = async () => {
    if (!formData.targetDomain || !formData.accessDomain) {
      toast({
        title: "缺少域名",
        description: "请输入目标域名和访问域名",
        variant: "destructive",
      });
      return;
    }

    const email = getCookie('cf_email') || cfEmail;
    const apiKey = getCookie('cf_api_key') || cfApiKey;

    if (!email || !apiKey) {
      toast({
        title: "凭据丢失",
        description: "请先配置 Cloudflare 凭证",
        variant: "destructive",
      });
      return;
    }

    setIsDeploying(true);
    setDeployProgress(0);

    try {
      // Simulate progress updates
      setDeployProgress(25);
      
      const { data, error } = await invokeWorkerApi('deploy-worker', {
        email,
        apiKey,
        targetDomain: formData.targetDomain,
        accessDomain: formData.accessDomain,
        optimizedDomain: formData.optimizedDomain,
        cacheTtl: parseInt(formData.cacheTtl) || 0,
      });

      setDeployProgress(75);

      if (error) throw error;

      if (!data.success) {
        toast({
          title: "部署失败",
          description: data.error || "无法部署 Worker",
          variant: "destructive",
        });
        setIsDeploying(false);
        return;
      }

      setDeployProgress(100);
      
      toast({
        title: "部署成功",
        description: "您的网站加速已成功部署，约10-30秒生效",
      });
      
      setTimeout(() => {
        setCurrentStep("complete");
      }, 500);
    } catch (error) {
      console.error('部署错误:', error);
      toast({
        title: "部署失败",
        description: error.message || "部署过程中发生错误，请检查您的配置",
        variant: "destructive",
      });
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3">
      {/* Step 1: Domains */}
      {currentStep === "domains" && (
        <Card className="p-4 shadow-card">
          <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            一键加速域名配置
          </h2>
          <div className="space-y-3">
            <div>
              <Label htmlFor="targetDomain" className="text-sm">目标域名</Label>
              <Input
                id="targetDomain"
                type="text"
                placeholder="jiasu.xx.com"
                value={formData.targetDomain}
                onChange={(e) => updateFormData("targetDomain", e.target.value)}
                className="mt-1 h-9 text-sm"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                你需要加速的网站/回源域名
              </p>
            </div>
            <div>
              <Label htmlFor="accessDomain" className="text-sm">访问域名</Label>
              <Input
                id="accessDomain"
                type="text"
                placeholder="www.xx.com"
                value={formData.accessDomain}
                onChange={(e) => updateFormData("accessDomain", e.target.value)}
                className="mt-1 h-9 text-sm"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                访问者将使用此域名访问您的内容
              </p>
            </div>
            <div>
              <Label htmlFor="cacheTtl" className="text-sm">缓存时间（秒）</Label>
              <Input
                id="cacheTtl"
                type="number"
                placeholder="0"
                value={formData.cacheTtl}
                onChange={(e) => updateFormData("cacheTtl", e.target.value)}
                className="mt-1 h-9 text-sm"
                min="0"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                0 表示不开启缓存，2592000 为一个月。默认：0
              </p>
            </div>
            <div>
              <Label htmlFor="optimizedDomain" className="text-sm">优选域名</Label>
              <select
                id="optimizedDomain"
                value={formData.optimizedDomain}
                onChange={(e) => updateFormData("optimizedDomain", e.target.value)}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="cdns.doon.eu.org">cdns.doon.eu.org</option>
                <option value="cloudflare.182682.xyz">cloudflare.182682.xyz</option>
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">
                选择优选域名或保持默认
              </p>
            </div>
            <Button
              onClick={handleConfigComplete}
              className="w-full h-9 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-glow text-sm"
            >
              配置完成
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Deploy */}
      {currentStep === "deploy" && (
        <Card className="p-4 shadow-card">
          <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            准备部署
          </h2>
          <div className="space-y-4">
            <div className="bg-muted/50 p-3 rounded-lg space-y-1.5">
              <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                配置摘要
              </h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">目标域名：</span>
                  <span className="font-medium">{formData.targetDomain}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">访问域名：</span>
                  <span className="font-medium">{formData.accessDomain}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">优选域名：</span>
                  <span className="font-medium">{formData.optimizedDomain}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">缓存时间：</span>
                  <span className="font-medium">
                    {formData.cacheTtl === "0" ? "不开启缓存" : `${formData.cacheTtl} 秒`}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-xs">部署进度</h4>
                  <span className="text-xs text-muted-foreground">{deployProgress}%</span>
                </div>
                <Progress value={deployProgress} className="h-2" />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setCurrentStep("domains")}
                variant="outline"
                className="flex-1 h-9 text-sm"
                disabled={isDeploying}
              >
                返回
              </Button>
              <Button
                onClick={deployWorker}
                disabled={isDeploying}
                className="flex-1 h-9 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-glow text-sm"
              >
                {isDeploying ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    加速中...
                  </>
                ) : (
                  "开始加速"
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 3: Complete */}
      {currentStep === "complete" && (
        <Card className="p-4 shadow-card text-center">
          <div className="w-12 h-12 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-3 shadow-glow">
            <CheckCircle2 className="w-6 h-6 text-primary-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">部署成功！</h2>
          <p className="text-muted-foreground mb-4 text-sm">
            您的网站加速已成功部署，约10-30秒生效
          </p>
          <div className="bg-muted/50 p-3 rounded-lg text-left space-y-1.5 mb-4">
            <div className="text-xs">
              <span className="text-muted-foreground">访问域名：</span>{" "}
              <a
                href={`https://${formData.accessDomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                {formData.accessDomain}
              </a>
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">Worker 状态：</span>{" "}
              <span className="font-medium text-primary">运行中</span>
            </div>
          </div>
          <Button
            onClick={() => {
              setCurrentStep("domains");
              setFormData({
                targetDomain: "",
                accessDomain: "",
                optimizedDomain: "cdns.doon.eu.org",
                cacheTtl: "0",
              });
            }}
            className="h-9 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-glow text-sm"
          >
            部署下一个加速
          </Button>
        </Card>
      )}

    </div>
  );
};
