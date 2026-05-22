import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Shield } from "lucide-react";
import type { CertificatesViewProps } from "./certificates-types";

export function CertificatesView({
  certificates,
  isLoading,
  onBack,
  onRefresh,
  selectedZoneName,
}: CertificatesViewProps) {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          ← 返回域名列表
        </Button>
        <Button onClick={onRefresh} disabled={isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          刷新
        </Button>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            证书管理
          </CardTitle>
          <CardDescription>
            {selectedZoneName ? `当前域名: ${selectedZoneName}` : "SSL/TLS 证书清单"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {certificates.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">暂无证书</div>
          )}
          {certificates.length > 0 && (
            <div className="space-y-2">
              {certificates.map((cert) => (
                <div key={cert.id} className="p-3 border border-border/50 rounded-md">
                  <div className="font-medium">{cert.hosts.join(", ") || "Unknown"}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    状态: {cert.status} · 到期: {cert.expiresOn}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
