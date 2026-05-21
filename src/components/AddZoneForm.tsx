import { useState } from "react";
import { supabase } from "@/lib/supabase-adapter";
import { useToast } from "@/hooks/use-toast";
import { getCookie } from "@/lib/cookies";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react";

interface AddZoneFormProps {
  onSuccess: () => void;
}

const AddZoneForm = ({ onSuccess }: AddZoneFormProps) => {
  const { toast } = useToast();
  const [domainName, setDomainName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!domainName.trim()) {
      toast({
        title: "请输入域名",
        variant: "destructive",
      });
      return;
    }

    const email = getCookie('cf_email');
    const apiKey = getCookie('cf_api_key');
    if (!email || !apiKey) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cloudflare-api', {
        body: {
          action: 'create_zone',
          email,
          apiKey,
          data: { name: domainName.trim() }
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "域名添加成功",
          description: data.result.status === 'pending' 
            ? "请在域名列表中查看名称服务器信息" 
            : `${domainName} 已成功添加并激活`,
        });
        setDomainName("");
        onSuccess();
      } else {
        toast({
          title: "添加域名失败",
          description: data.errors?.[0]?.message || "未知错误",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Add zone error:', error);
      toast({
        title: "添加失败",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-card mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Plus className="w-4 h-4" />
          添加新域名
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3">
        <form onSubmit={handleSubmit} className="space-y-2" autoComplete="off">
          <div className="flex gap-2">
            <div className="flex-1 space-y-1.5">
              <Input
                id="domainName"
                type="text"
                value={domainName}
                onChange={(e) => setDomainName(e.target.value)}
                placeholder="example.com"
                disabled={isLoading}
                autoComplete="off"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  添加中...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  添加域名
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            输入您想要添加到 Cloudflare 的域名（不包含 www 或其他子域名）
          </p>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddZoneForm;
