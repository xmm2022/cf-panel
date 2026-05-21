import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { getCookie } from '@/lib/cookies';

interface CreateRateLimitRuleFormProps {
  zoneId: string;
  rulesetId: string;
  email?: string;
  apiKey?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CreateRateLimitRuleForm({
  zoneId,
  rulesetId,
  email: propsEmail,
  apiKey: propsApiKey,
  onSuccess,
  onCancel,
}: CreateRateLimitRuleFormProps) {
  const [description, setDescription] = useState('');
  const [expression, setExpression] = useState('');
  const [action, setAction] = useState('block');
  const [period, setPeriod] = useState('60');
  const [requestsPerPeriod, setRequestsPerPeriod] = useState('100');
  const [mitigationTimeout, setMitigationTimeout] = useState('600');
  const [characteristics, setCharacteristics] = useState('cf.colo.id,ip.src');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const email = propsEmail || getCookie('cf_email');
      const apiKey = propsApiKey || getCookie('cf_api_key');

      if (!email || !apiKey) {
        toast.error('缺少认证信息');
        return;
      }
      const { supabase } = await import('@/lib/supabase-adapter');
      
      const ruleData = {
        description,
        expression,
        action,
        ratelimit: {
          characteristics: characteristics.split(',').map(c => c.trim()),
          period: parseInt(period),
          requests_per_period: parseInt(requestsPerPeriod),
          mitigation_timeout: parseInt(mitigationTimeout),
        },
      };
      
      const { data, error } = await supabase.functions.invoke('cloudflare-api', {
        body: {
          action: 'create_rate_limit_rule',
          email,
          apiKey,
          zoneId,
          rulesetId,
          rule: ruleData,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.errors?.[0]?.message || '创建失败');

      toast.success('速率限制规则创建成功');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="description">规则描述</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="例如: API速率限制"
          required
        />
      </div>

      <div>
        <Label htmlFor="expression">匹配表达式</Label>
        <Textarea
          id="expression"
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          placeholder='例如: (http.request.uri.path matches "^/api/")'
          required
          rows={3}
        />
        <p className="text-xs text-muted-foreground mt-1">
          使用 Cloudflare 表达式语法
        </p>
      </div>

      <div>
        <Label htmlFor="action">触发动作</Label>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="block">阻止 (Block)</SelectItem>
            <SelectItem value="challenge">质询 (Challenge)</SelectItem>
            <SelectItem value="js_challenge">JS质询 (JS Challenge)</SelectItem>
            <SelectItem value="managed_challenge">托管质询 (Managed Challenge)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="period">时间窗口(秒)</Label>
          <Input
            id="period"
            type="number"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            min="1"
            max="86400"
            required
          />
        </div>
        <div>
          <Label htmlFor="requests">请求数限制</Label>
          <Input
            id="requests"
            type="number"
            value={requestsPerPeriod}
            onChange={(e) => setRequestsPerPeriod(e.target.value)}
            min="1"
            required
          />
        </div>
        <div>
          <Label htmlFor="timeout">封禁时长(秒)</Label>
          <Input
            id="timeout"
            type="number"
            value={mitigationTimeout}
            onChange={(e) => setMitigationTimeout(e.target.value)}
            min="1"
            max="86400"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="characteristics">计数特征</Label>
        <Input
          id="characteristics"
          value={characteristics}
          onChange={(e) => setCharacteristics(e.target.value)}
          placeholder="用逗号分隔，例如: cf.colo.id,ip.src"
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          常用: cf.colo.id, ip.src, http.request.headers["x-api-key"]
        </p>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? '创建中...' : '创建规则'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
      </div>
    </form>
  );
}
