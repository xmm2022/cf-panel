import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase-adapter';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface WorkerAnalyticsPanelProps {
  accountId: string;
  email: string;
  apiKey: string;
  scriptName?: string;
}

interface AnalyticsDataPoint {
  date: string;
  requests: number;
  errors: number;
  subrequests: number;
  cpuTimeP50?: number;
  cpuTimeP99?: number;
}

interface WorkerInvocationPoint {
  dimensions?: {
    date?: string;
    datetime?: string;
  };
  sum?: {
    requests?: number;
    errors?: number;
    subrequests?: number;
  };
  quantiles?: {
    cpuTimeP50?: number;
    cpuTimeP99?: number;
  };
}

interface WorkerAnalyticsResponse {
  success: boolean;
  errors?: Array<{ message: string }>;
  result?: {
    viewer?: {
      accounts?: Array<{
        workersInvocationsAdaptive?: WorkerInvocationPoint[];
      }>;
    };
  };
}

export function WorkerAnalyticsPanel({ accountId, email, apiKey, scriptName }: WorkerAnalyticsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalyticsDataPoint[]>([]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: result, error } = await supabase.functions.invoke<WorkerAnalyticsResponse>('cf-worker-analytics', {
        body: { 
          email, 
          apiKey, 
          accountId, 
          ...(scriptName && { scriptName }), 
          since: today.toISOString(), 
          until: tomorrow.toISOString() 
        }
      });

      if (error) throw error;

      if (!result.success) {
        throw new Error(result.errors?.[0]?.message || 'Failed to fetch analytics');
      }

      const invocations = result.result?.viewer?.accounts?.[0]?.workersInvocationsAdaptive || [];
      
      // 按日期聚合数据
      const dailyData = invocations.reduce((acc: Record<string, AnalyticsDataPoint>, item) => {
        const date = item.dimensions?.date || item.dimensions?.datetime?.split('T')[0] || '';
        if (!acc[date]) {
          acc[date] = {
            date,
            requests: 0,
            errors: 0,
            subrequests: 0,
          };
        }
        acc[date].requests += item.sum?.requests || 0;
        acc[date].errors += item.sum?.errors || 0;
        acc[date].subrequests += item.sum?.subrequests || 0;
        if (item.quantiles) {
          acc[date].cpuTimeP50 = item.quantiles.cpuTimeP50;
          acc[date].cpuTimeP99 = item.quantiles.cpuTimeP99;
        }
        return acc;
      }, {});

      const sortedData = (Object.values(dailyData) as AnalyticsDataPoint[]).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      setData(sortedData);
    } catch (err) {
      console.error('Failed to fetch worker analytics:', err);
      toast.error('获取分析数据失败: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [accountId, apiKey, email, scriptName]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  const totalRequests = data.reduce((sum, d) => sum + d.requests, 0);
  const totalErrors = data.reduce((sum, d) => sum + d.errors, 0);
  const avgRequests = data.length > 0 ? Math.round(totalRequests / data.length) : 0;
  const errorRate = totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(2) : '0.00';
  
  // 计算今日请求数
  const today = new Date().toISOString().split('T')[0];
  const todayData = data.find(d => d.date === today);
  const todayRequests = todayData?.requests || 0;
  const requestLimit = 100000; // Cloudflare Free Plan 每日限额

  return (
    <Card>
      <CardContent className="pt-6 pb-4">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            <CardDescription>今天的请求</CardDescription>
            <div className="text-2xl font-semibold">
              {todayRequests.toLocaleString()} / {requestLimit.toLocaleString()}
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary rounded-full h-2 transition-all duration-300" 
                style={{ width: `${Math.min((todayRequests / requestLimit) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
