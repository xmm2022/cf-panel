import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, History, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-adapter';

interface OperationRecord {
  id: string;
  operation_type: string;
  resource_type: string;
  resource_name?: string;
  zone_id?: string;
  action_details?: string;
  status: string;
  error_message?: string;
  created_at: string;
}

interface OperationHistoryPanelProps {
  userId: string;
}

export default function OperationHistoryPanel({ userId }: OperationHistoryPanelProps) {
  const [history, setHistory] = useState<OperationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('operation-history', {
        body: { action: 'list', userId, limit: 100 }
      });

      if (error) throw error;
      
      if (data?.success) {
        setHistory(data.data || []);
      } else if (data?.error === 'Database not configured') {
        toast.error('D1 数据库未配置，请先在 Cloudflare 创建 D1 数据库');
      } else {
        toast.error(data?.error || '加载操作历史失败');
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
      toast.error('加载操作历史失败：请确保 Worker 已部署');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const deleteRecord = async (recordId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('operation-history', {
        body: { action: 'delete', userId, recordId }
      });

      if (error) throw error;
      if (data?.success) {
        setHistory(prev => prev.filter(r => r.id !== recordId));
        toast.success('删除成功');
      }
    } catch (error) {
      console.error('Failed to delete record:', error);
      toast.error('删除失败');
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          操作历史
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">加载中...</p>
          ) : history.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">暂无操作记录</p>
          ) : (
            <div className="space-y-3">
              {history.map((record) => (
                <Card key={record.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {record.status === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <Badge variant={record.status === 'success' ? 'default' : 'destructive'}>
                          {record.operation_type}
                        </Badge>
                        <Badge variant="outline">{record.resource_type}</Badge>
                        {record.resource_name && (
                          <span className="text-sm font-medium">{record.resource_name}</span>
                        )}
                      </div>
                      
                      {record.action_details && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {record.action_details}
                        </p>
                      )}
                      
                      {record.error_message && (
                        <p className="text-sm text-destructive mb-2">
                          错误: {record.error_message}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatTime(record.created_at)}
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRecord(record.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
