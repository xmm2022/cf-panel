import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Plus, Trash2, Edit, Lightbulb, Bug, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-adapter';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Feedback {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description?: string;
  contact_info?: string;
  status: string;
  votes: number;
  created_at: string;
}

interface FeedbackLibraryProps {
  userId: string;
  isAdmin?: boolean;
}

const FEEDBACK_TYPES = [
  { value: 'feature', label: '功能需求', icon: Lightbulb },
  { value: 'bug', label: 'Bug 报告', icon: Bug },
  { value: 'suggestion', label: '建议', icon: ThumbsUp }
];

const STATUS_OPTIONS = [
  { value: 'pending', label: '待处理', variant: 'secondary' as const },
  { value: 'in_progress', label: '进行中', variant: 'default' as const },
  { value: 'completed', label: '已完成', variant: 'outline' as const },
  { value: 'rejected', label: '已拒绝', variant: 'destructive' as const }
];

export default function FeedbackLibrary({ userId, isAdmin = false }: FeedbackLibraryProps) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<Feedback | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState<Feedback | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'feature',
    contactInfo: '',
    status: 'pending',
  });

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('feedback-system', {
        body: { action: 'list' }
      });

      if (error) throw error;
      
      if (data?.success) {
        setFeedbacks(data.data || []);
      } else if (data?.error === 'Database not configured') {
        toast.error('D1 数据库未配置，请先在 Cloudflare 创建 D1 数据库');
      } else {
        toast.error(data?.error || '加载反馈失败');
      }
    } catch (error) {
      console.error('Failed to fetch feedbacks:', error);
      toast.error('加载反馈失败：请确保 Worker 已部署');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.description) {
      toast.error('请填写标题和描述');
      return;
    }

    try {
      const action = editingFeedback ? 'update' : 'create';
      const body = {
        action,
        userId,
        title: formData.title,
        description: formData.description,
        type: formData.type,
        contactInfo: formData.contactInfo,
        isAdmin, // 传递管理员标识
        ...(editingFeedback && { 
          feedbackId: editingFeedback.id,
          status: formData.status 
        }),
      };

      const { data, error } = await supabase.functions.invoke('feedback-system', { body });

      if (error) throw error;
      if (data?.success) {
        toast.success(editingFeedback ? '更新成功' : '提交成功，感谢您的反馈！');
        setIsDialogOpen(false);
        resetForm();
        fetchFeedbacks();
      }
    } catch (error) {
      console.error('Failed to save feedback:', error);
      toast.error('保存失败');
    }
  };

  const confirmDelete = (feedback: Feedback) => {
    setFeedbackToDelete(feedback);
    setDeleteConfirmOpen(true);
  };

  const deleteFeedback = async () => {
    if (!feedbackToDelete) return;

    try {
      const { data, error } = await supabase.functions.invoke('feedback-system', {
        body: { action: 'delete', userId, feedbackId: feedbackToDelete.id, isAdmin }
      });

      if (error) throw error;
      if (data?.success) {
        setFeedbacks(prev => prev.filter(f => f.id !== feedbackToDelete.id));
        toast.success('删除成功');
      }
    } catch (error) {
      console.error('Failed to delete feedback:', error);
      toast.error('删除失败');
    } finally {
      setDeleteConfirmOpen(false);
      setFeedbackToDelete(null);
    }
  };

  const voteFeedback = async (feedback: Feedback) => {
    try {
      const { data, error } = await supabase.functions.invoke('feedback-system', {
        body: { action: 'vote', feedbackId: feedback.id }
      });

      if (error) throw error;
      if (data?.success) {
        setFeedbacks(prev => prev.map(f => 
          f.id === feedback.id ? { ...f, votes: f.votes + 1 } : f
        ));
        toast.success('投票成功');
      }
    } catch (error) {
      console.error('Failed to vote:', error);
      toast.error('投票失败');
    }
  };

  const editFeedback = (feedback: Feedback) => {
    setEditingFeedback(feedback);
    setFormData({
      title: feedback.title,
      description: feedback.description || '',
      type: feedback.type,
      contactInfo: feedback.contact_info || '',
      status: feedback.status,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'feature',
      contactInfo: '',
      status: 'pending',
    });
    setEditingFeedback(null);
  };

  const getTypeIcon = (type: string) => {
    const typeConfig = FEEDBACK_TYPES.find(t => t.value === type);
    const Icon = typeConfig?.icon || MessageSquare;
    return <Icon className="w-4 h-4" />;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = STATUS_OPTIONS.find(s => s.value === status);
    return (
      <Badge variant={statusConfig?.variant || 'secondary'}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const filteredFeedbacks = feedbacks
    .filter(f => selectedType === 'all' || f.type === selectedType)
    .filter(f => selectedStatus === 'all' || f.status === selectedStatus)
    .sort((a, b) => b.votes - a.votes); // 按投票数排序

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              需求开发
            </CardTitle>
            <CardDescription>提交功能需求、Bug 报告或建议</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                提交反馈
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingFeedback ? '编辑反馈' : '提交反馈'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>反馈类型</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FEEDBACK_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>标题</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="简短描述您的反馈"
                  />
                </div>
                <div>
                  <Label>详细描述</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="请详细描述您的需求、遇到的问题或建议"
                    className="min-h-[150px]"
                  />
                </div>
                <div>
                  <Label>联系方式（可选）</Label>
                  <Input
                    value={formData.contactInfo}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactInfo: e.target.value }))}
                    placeholder="邮箱、微信等，方便我们联系您"
                  />
                </div>
                {(editingFeedback && isAdmin) && (
                  <div>
                    <Label>状态（仅管理员）</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(status => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleSubmit}>
                    {editingFeedback ? '更新' : '提交'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-2">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="选择类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {FEEDBACK_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="选择状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              {STATUS_OPTIONS.map(status => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="h-[500px]">
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">加载中...</p>
          ) : filteredFeedbacks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">暂无反馈</p>
          ) : (
            <div className="grid gap-4">
              {filteredFeedbacks.map((feedback) => (
                <Card key={feedback.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getTypeIcon(feedback.type)}
                        <h3 className="font-semibold">{feedback.title}</h3>
                        {getStatusBadge(feedback.status)}
                      </div>
                      {feedback.description && (
                        <p className="text-sm text-muted-foreground mb-2">{feedback.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{new Date(feedback.created_at).toLocaleDateString()}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-xs"
                          onClick={() => voteFeedback(feedback)}
                        >
                          👍 {feedback.votes} 票
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {(feedback.user_id === userId || isAdmin) && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => editFeedback(feedback)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => confirmDelete(feedback)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除反馈 "{feedbackToDelete?.title}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={deleteFeedback}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
