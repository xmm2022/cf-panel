import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, Settings } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-adapter';

interface AutoOptimizationPanelProps {
  zoneId: string;
  userId: string;
  zoneName?: string;
  email: string;
  apiKey: string;
}

interface ZoneSettingUpdateResult {
  setting: string;
  success: boolean;
}

interface ZoneSettingsUpdateResponse {
  success?: boolean;
  result?: ZoneSettingUpdateResult[];
  errors?: Array<{ message: string }>;
}

interface ZoneSettingInput {
  id: string;
  value: unknown;
}

export default function AutoOptimizationPanel({ zoneId, userId, zoneName, email, apiKey }: AutoOptimizationPanelProps) {
  const [optimizationType, setOptimizationType] = useState<string>('');
  const [isOptimizing, setIsOptimizing] = useState(false);

  // 操作选项
  const [proxyIpEnabled, setProxyIpEnabled] = useState(true);
  const [blockQueryParams, setBlockQueryParams] = useState(false);
  const [blockNonChinaTraffic, setBlockNonChinaTraffic] = useState(true);
  const [blockNonGetTraffic, setBlockNonGetTraffic] = useState(false);
  const [underAttackMode, setUnderAttackMode] = useState(false);

  // 安全设置
  const [securityLevel, setSecurityLevel] = useState<string>('medium');
  const [challengeTtl, setChallengeTtl] = useState<string>('1800');
  const [browserCheck, setBrowserCheck] = useState(true);
  const [hotlinkProtection, setHotlinkProtection] = useState(false);
  const [emailObfuscation, setEmailObfuscation] = useState(true);
  const [ipv6Enabled, setIpv6Enabled] = useState(true);
  const [tieredCaching, setTieredCaching] = useState(true);

  // 缓存设置
  const [compressHtml, setCompressHtml] = useState(true);
  const [compressCss, setCompressCss] = useState(true);
  const [compressJs, setCompressJs] = useState(true);
  const [cacheLevel, setCacheLevel] = useState<string>('aggressive');
  const [cdnCacheTtl, setCdnCacheTtl] = useState<string>('7200');
  const [cacheAllPages, setCacheAllPages] = useState(true);
  const [cacheHtml, setCacheHtml] = useState(true);

  // 性能设置
  const [brotliEnabled, setBrotliEnabled] = useState(false);
  const [rocketLoaderMode, setRocketLoaderMode] = useState<string>('off');
  const [http3Enabled, setHttp3Enabled] = useState(false);
  const [zeroRttEnabled, setZeroRttEnabled] = useState(false);

  // 监听优化类型变化，自动更新手动设置
  useEffect(() => {
    if (!optimizationType) return;

    if (optimizationType === 'security') {
      // 安全级别
      setSecurityLevel('high');
      setChallengeTtl('1800');
      setBrowserCheck(true);
      setHotlinkProtection(true);
      
      // 缓存设置
      setCacheLevel('basic');
      setCdnCacheTtl('14400');
      
    } else if (optimizationType === 'speed') {
      // 安全级别
      setSecurityLevel('low');
      
      // 缓存设置
      setCacheLevel('aggressive');
      setCdnCacheTtl('31536000');
      
      // 压缩设置
      setCompressHtml(true);
      setCompressCss(true);
      setCompressJs(true);
      
      // 性能设置
      setBrotliEnabled(true);
      setHttp3Enabled(true);
    }
  }, [optimizationType]);

  const startOptimization = async () => {
    if (!optimizationType) {
      toast.error('请选择优化方向');
      return;
    }

    setIsOptimizing(true);

    try {
      const settings = optimizationType === 'security' 
        ? getSecurityOptimizedSettings()
        : getSpeedOptimizedSettings();

      // 批量更新所有设置
      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        id: key,
        value: value
      }));

      const { data, error } = await supabase.functions.invoke<ZoneSettingsUpdateResponse>('cloudflare-api', {
        body: {
          action: 'update_zone_settings',
          email,
          apiKey,
          zoneId,
          settings: settingsArray
        }
      });

      if (error) throw error;

      const successFlag = data?.success;
      const result = data?.result;
      const errors = data?.errors;

      if (successFlag) {
        toast.success(`${optimizationType === 'security' ? '安全' : '速度'}优化配置已应用`);
      } else if (Array.isArray(result)) {
        const ok = result.filter(r => r.success).map(r => r.setting);
        const fail = result.filter(r => !r.success).map(r => r.setting);
        if (ok.length > 0) {
          toast.success(`已应用 ${ok.length} 项：${ok.join(', ')}${fail.length ? `；失败 ${fail.length} 项：${fail.join(', ')}` : ''}`);
        } else {
          toast.error(errors?.[0]?.message || '优化失败');
        }
      } else {
        toast.error(errors?.[0]?.message || '优化失败');
      }
    } catch (error) {
      console.error('Optimization error:', error);
      toast.error('优化失败');
    } finally {
      setIsOptimizing(false);
    }
  };

  const getSecurityOptimizedSettings = () => {
    return {
      security_level: 'high',
      ssl: 'strict',
      always_use_https: 'on',
      automatic_https_rewrites: 'on',
      tls_1_3: 'on',
      min_tls_version: '1.2',
      opportunistic_encryption: 'on',
      cache_level: 'basic',
      browser_cache_ttl: 14400,
      challenge_ttl: 1800,
      browser_check: 'on',
      hotlink_protection: 'on',
    };
  };

  const getSpeedOptimizedSettings = () => {
    return {
      security_level: 'low',
      ssl: 'flexible',
      cache_level: 'aggressive',
      browser_cache_ttl: 31536000,
      polish: 'lossless',
      minify: {
        css: 'on',
        html: 'on',
        js: 'on'
      },
      brotli: 'on',
      early_hints: 'on',
      // http2 与 zero_rtt 在部分场景不可设置，避免报错
      http3: 'on'
    };
  };

  const applyAllSettings = async () => {
    setIsOptimizing(true);
    try {
      const settingsToApply: ZoneSettingInput[] = [];

      // 安全设置
      settingsToApply.push(
        { id: 'security_level', value: securityLevel },
        { id: 'challenge_ttl', value: parseInt(challengeTtl) },
        { id: 'browser_check', value: browserCheck ? 'on' : 'off' },
        { id: 'hotlink_protection', value: hotlinkProtection ? 'on' : 'off' },
        { id: 'email_obfuscation', value: emailObfuscation ? 'on' : 'off' },
        { id: 'ipv6', value: ipv6Enabled ? 'on' : 'off' }
      );

      // 压缩设置
      settingsToApply.push({
        id: 'minify',
        value: {
          html: compressHtml ? 'on' : 'off',
          css: compressCss ? 'on' : 'off',
          js: compressJs ? 'on' : 'off'
        }
      });

      // 缓存设置
      settingsToApply.push(
        { id: 'cache_level', value: cacheLevel },
        { id: 'browser_cache_ttl', value: parseInt(cdnCacheTtl) }
      );

      // 性能设置
      settingsToApply.push(
        { id: 'brotli', value: brotliEnabled ? 'on' : 'off' },
        { id: 'rocket_loader', value: rocketLoaderMode === 'on' ? 'on' : 'off' },
        { id: 'http3', value: http3Enabled ? 'on' : 'off' },
        { id: '0rtt', value: zeroRttEnabled ? 'on' : 'off' }
      );

      const { data, error } = await supabase.functions.invoke<ZoneSettingsUpdateResponse>('cloudflare-api', {
        body: {
          action: 'update_zone_settings',
          email,
          apiKey,
          zoneId,
          settings: settingsToApply
        }
      });

      if (error) throw error;
      const successFlag = data?.success;
      const result = data?.result;
      const errors = data?.errors;

      if (successFlag) {
        toast.success('所有设置已应用');
      } else if (Array.isArray(result)) {
        const ok = result.filter(r => r.success).map(r => r.setting);
        const fail = result.filter(r => !r.success).map(r => r.setting);
        if (ok.length > 0) {
          toast.success(`已应用 ${ok.length} 项：${ok.join(', ')}${fail.length ? `；失败 ${fail.length} 项：${fail.join(', ')}` : ''}`);
        } else {
          toast.error(errors?.[0]?.message || '设置失败');
        }
      } else {
        toast.error(errors?.[0]?.message || '设置失败');
      }
    } catch (error) {
      console.error('Settings error:', error);
      toast.error('设置失败');
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="space-y-3 max-h-[calc(100vh-12rem)] overflow-y-auto">
      {/* 自动优化设置 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            自动优化设置 <span className="bg-foreground text-background px-2 py-0.5 text-xs ml-2">Auto</span>
            {zoneName && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                - {zoneName}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs space-y-1">
            <p><span className="font-semibold">最优安全</span>侧重防御，对部分用户体验稍有影响； <span className="font-semibold">最优速度</span>侧重速度，偏重于不干扰访问，可能容易被攻击；</p>
            <p className="text-destructive">注意：这里设置不会记录，每次都需要重新选择，点选开始优化，原有设置将全部清空，被我们的优化规则覆盖！</p>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <Select value={optimizationType} onValueChange={setOptimizationType}>
                <SelectTrigger className="flex-1 h-8">
                  <SelectValue placeholder="优化方向选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="security">最优安全</SelectItem>
                  <SelectItem value="speed">最优速度</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={startOptimization} 
                disabled={!optimizationType || isOptimizing}
                variant="destructive"
                size="sm"
              >
                {isOptimizing ? '优化中...' : '开始优化'}
              </Button>
            </div>

            {/* 显示优化内容列表 */}
            {optimizationType === 'security' && (
              <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                <h4 className="text-xs font-semibold mb-2">🛡️ 安全优化将配置：</h4>
                <ul className="text-xs grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                  <li>• 安全级别：高</li>
                  <li>• SSL模式：严格</li>
                  <li>• 强制HTTPS：开启</li>
                  <li>• HTTPS自动重写：开启</li>
                  <li>• TLS 1.3：启用</li>
                  <li>• 最低TLS版本：1.2</li>
                  <li>• 机会性加密：开启</li>
                  <li>• 缓存级别：基础</li>
                  <li>• 浏览器缓存：4小时</li>
                  <li>• 访客验证：30分钟</li>
                  <li>• 浏览器检查：开启</li>
                  <li>• 防盗链保护：开启</li>
                </ul>
              </div>
            )}

            {optimizationType === 'speed' && (
              <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                <h4 className="text-xs font-semibold mb-2">⚡ 速度优化将配置：</h4>
                <ul className="text-xs grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                  <li>• 安全级别：低</li>
                  <li>• SSL模式：灵活</li>
                  <li>• 缓存级别：积极</li>
                  <li>• 浏览器缓存：1年</li>
                  <li>• 图片优化：无损</li>
                  <li>• HTML压缩：启用</li>
                  <li>• CSS压缩：启用</li>
                  <li>• JS压缩：启用</li>
                  <li>• Brotli压缩：启用</li>
                  <li>• Early Hints：启用</li>
                  <li>• HTTP/3：启用</li>
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 操作选项与安全设置合并 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">操作选项与安全设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start justify-between p-2 border rounded">
              <div className="flex-1">
                <Label className="text-xs font-medium">操作代理IP</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">隐藏真实IP，建议开启</p>
              </div>
              <Switch
                checked={proxyIpEnabled}
                onCheckedChange={setProxyIpEnabled}
                className="scale-75 mt-1"
              />
            </div>
            <div className="flex items-start justify-between p-2 border rounded">
              <div className="flex-1">
                <Label className="text-xs font-medium">拦截带?参数</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">阻止查询参数攻击，按需开启</p>
              </div>
              <Switch
                checked={blockQueryParams}
                onCheckedChange={setBlockQueryParams}
                className="scale-75 mt-1"
              />
            </div>
            <div className="flex items-start justify-between p-2 border rounded">
              <div className="flex-1">
                <Label className="text-xs font-medium">拦截非中国流量</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">仅允许国内访问，按需开启</p>
              </div>
              <Switch
                checked={blockNonChinaTraffic}
                onCheckedChange={setBlockNonChinaTraffic}
                className="scale-75 mt-1"
              />
            </div>
            <div className="flex items-start justify-between p-2 border rounded">
              <div className="flex-1">
                <Label className="text-xs font-medium">拦截非GET流量</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">阻止POST等请求，不建议</p>
              </div>
              <Switch
                checked={blockNonGetTraffic}
                onCheckedChange={setBlockNonGetTraffic}
                className="scale-75 mt-1"
              />
            </div>
          </div>

          <div className="flex items-start justify-between p-2 bg-destructive/5 rounded border border-destructive/20">
            <div className="flex-1">
              <Label className="text-xs font-semibold">
                启用5秒盾 (Under Attack Mode)
              </Label>
              <p className="text-[10px] text-muted-foreground mt-0.5">最强防护，影响体验，仅攻击时开启</p>
            </div>
            <Switch
              checked={underAttackMode}
              onCheckedChange={setUnderAttackMode}
              className="scale-75 mt-1"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t">
            <div className="space-y-1">
              <Label className="text-xs font-medium">安全级别 <span className="text-[10px] text-muted-foreground">(建议:高)</span></Label>
              <Select value={securityLevel} onValueChange={setSecurityLevel}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">关闭</SelectItem>
                  <SelectItem value="essentially_off">基本关闭</SelectItem>
                  <SelectItem value="low">低</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="high">高 ⭐</SelectItem>
                  <SelectItem value="under_attack">受攻击</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">威胁检测级别，越高越安全</p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">访客重验时长 <span className="text-[10px] text-muted-foreground">(建议:30分钟)</span></Label>
              <Select value={challengeTtl} onValueChange={setChallengeTtl}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="300">5分钟</SelectItem>
                  <SelectItem value="900">15分钟</SelectItem>
                  <SelectItem value="1800">半小时 ⭐</SelectItem>
                  <SelectItem value="3600">1小时</SelectItem>
                  <SelectItem value="7200">2小时</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">验证有效期，平衡安全与体验</p>
            </div>

            <div className="flex items-start justify-between p-2 border rounded">
              <div className="flex-1">
                <Label className="text-xs font-medium">浏览器检查</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">验证真实浏览器，建议开启</p>
              </div>
              <Switch
                checked={browserCheck}
                onCheckedChange={setBrowserCheck}
                className="scale-75 mt-1"
              />
            </div>

            <div className="flex items-start justify-between p-2 border rounded">
              <div className="flex-1">
                <Label className="text-xs font-medium">防盗链</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">防止资源盗用，推荐开启</p>
              </div>
              <Switch
                checked={hotlinkProtection}
                onCheckedChange={setHotlinkProtection}
                className="scale-75 mt-1"
              />
            </div>

            <div className="flex items-start justify-between p-2 border rounded">
              <div className="flex-1">
                <Label className="text-xs font-medium">Email加密</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">隐藏邮箱地址，可选</p>
              </div>
              <Switch
                checked={emailObfuscation}
                onCheckedChange={setEmailObfuscation}
                className="scale-75 mt-1"
              />
            </div>

            <div className="flex items-start justify-between p-2 border rounded">
              <div className="flex-1">
                <Label className="text-xs font-medium">IPV6</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">支持IPv6网络，建议开启</p>
              </div>
              <Switch
                checked={ipv6Enabled}
                onCheckedChange={setIpv6Enabled}
                className="scale-75 mt-1"
              />
            </div>

            <div className="flex items-start justify-between p-2 border rounded">
              <div className="flex-1">
                <Label className="text-xs font-medium">分层缓存</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">多级缓存加速，建议开启</p>
              </div>
              <Switch
                checked={tieredCaching}
                onCheckedChange={setTieredCaching}
                className="scale-75 mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 缓存设置 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">缓存设置</CardTitle>
          <CardDescription className="text-xs">
            默认缓存只对基础静态文件有效，更多文件的缓存请通过页面设置进行设置
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs font-medium">代码压缩 <span className="text-[10px] text-muted-foreground">(全部建议开启)</span></Label>
            <div className="flex gap-1">
              <Button
                variant={compressHtml ? "default" : "outline"}
                size="sm"
                onClick={() => setCompressHtml(!compressHtml)}
                className="h-6 px-2 text-xs"
              >
                html
              </Button>
              <Button
                variant={compressCss ? "default" : "outline"}
                size="sm"
                onClick={() => setCompressCss(!compressCss)}
                className="h-6 px-2 text-xs"
              >
                css
              </Button>
              <Button
                variant={compressJs ? "default" : "outline"}
                size="sm"
                onClick={() => setCompressJs(!compressJs)}
                className="h-6 px-2 text-xs"
              >
                js
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">自动压缩代码，提升加载速度</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">静态文件缓存 <span className="text-[10px] text-muted-foreground">(建议:积极)</span></Label>
              <Select value={cacheLevel} onValueChange={setCacheLevel}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">基础</SelectItem>
                  <SelectItem value="simplified">简化</SelectItem>
                  <SelectItem value="aggressive">积极 ⭐</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">缓存策略，积极可提升速度</p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">浏览器缓存时间 <span className="text-[10px] text-muted-foreground">(建议:4小时)</span></Label>
              <Select value={cdnCacheTtl} onValueChange={setCdnCacheTtl}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1800">30分钟</SelectItem>
                  <SelectItem value="3600">1小时</SelectItem>
                  <SelectItem value="7200">2小时</SelectItem>
                  <SelectItem value="14400">4小时 ⭐</SelectItem>
                  <SelectItem value="86400">1天</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">浏览器本地缓存时长</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">页面规则</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="flex items-start justify-between p-2 border rounded">
                <div className="flex-1">
                  <Label className="text-xs font-medium">全站缓存</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">缓存所有页面，静态站推荐</p>
                </div>
                <Switch
                  checked={cacheAllPages}
                  onCheckedChange={setCacheAllPages}
                  className="scale-75 mt-1"
                />
              </div>
              <div className="flex items-start justify-between p-2 border rounded">
                <div className="flex-1">
                  <Label className="text-xs font-medium">缓存HTML</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">缓存HTML文件，静态站推荐</p>
                </div>
                <Switch
                  checked={cacheHtml}
                  onCheckedChange={setCacheHtml}
                  className="scale-75 mt-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 性能设置 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">性能加速</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start justify-between p-2 border rounded">
              <div className="flex-1">
                <Label className="text-xs font-medium">Brotli 压缩</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">比Gzip更高效，建议开启</p>
              </div>
              <Switch
                checked={brotliEnabled}
                onCheckedChange={setBrotliEnabled}
                className="scale-75 mt-1"
              />
            </div>
            <div className="flex items-start justify-between p-2 border rounded">
              <div className="flex-1">
                <Label className="text-xs font-medium">HTTP/3</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">最新协议，提升速度，推荐</p>
              </div>
              <Switch
                checked={http3Enabled}
                onCheckedChange={setHttp3Enabled}
                className="scale-75 mt-1"
              />
            </div>
            <div className="flex items-start justify-between p-2 border rounded">
              <div className="flex-1">
                <Label className="text-xs font-medium">0-RTT</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">快速重连，可选开启</p>
              </div>
              <Switch
                checked={zeroRttEnabled}
                onCheckedChange={setZeroRttEnabled}
                className="scale-75 mt-1"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Rocket Loader <span className="text-[10px] text-muted-foreground">(不建议)</span></Label>
              <Select value={rocketLoaderMode} onValueChange={setRocketLoaderMode}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">关闭 ⭐</SelectItem>
                  <SelectItem value="on">启用</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">异步加载JS，可能导致问题</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 应用所有设置按钮 */}
      <Card>
        <CardContent className="pt-4">
          <Button 
            onClick={applyAllSettings} 
            disabled={isOptimizing}
            className="w-full h-10 text-sm font-semibold"
            size="lg"
          >
            {isOptimizing ? '应用中...' : '应用所有设置'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
