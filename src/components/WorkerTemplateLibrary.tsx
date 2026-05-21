import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Code2, Plus, Copy, Trash2, Edit, TrendingUp } from 'lucide-react';
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

interface WorkerTemplate {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  script_content: string;
  category: string;
  is_public: number;
  usage_count: number;
  created_at: string;
}

interface WorkerTemplateLibraryProps {
  userId: string;
  onUseTemplate?: (script: string) => void;
}

const CATEGORIES = ['general', 'proxy', 'api', 'redirect', 'security', 'optimization'];

export default function WorkerTemplateLibrary({ userId, onUseTemplate }: WorkerTemplateLibraryProps) {
  const [templates, setTemplates] = useState<WorkerTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkerTemplate | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<WorkerTemplate | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    scriptContent: '',
    category: 'general',
    isPublic: false,
  });

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('worker-templates', {
        body: { action: 'list', userId }
      });

      if (error) throw error;
      
      if (data?.success) {
        setTemplates(data.data || []);
      } else if (data?.error === 'Database not configured') {
        toast.error('D1 数据库未配置，请先在 Cloudflare 创建 D1 数据库');
      } else {
        toast.error(data?.error || '加载模板失败');
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast.error('加载模板失败：请确保 Worker 已部署');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.scriptContent) {
      toast.error('请填写模板名称和脚本内容');
      return;
    }

    try {
      const action = editingTemplate ? 'update' : 'create';
      const body = {
        action,
        userId,
        name: formData.name,
        description: formData.description,
        scriptContent: formData.scriptContent,
        category: formData.category,
        isPublic: formData.isPublic,
        ...(editingTemplate && { templateId: editingTemplate.id }),
      };

      const { data, error } = await supabase.functions.invoke('worker-templates', { body });

      if (error) throw error;
      if (data?.success) {
        toast.success(editingTemplate ? '更新成功' : '创建成功');
        setIsDialogOpen(false);
        resetForm();
        fetchTemplates();
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      toast.error('保存失败');
    }
  };

  const confirmDelete = (template: WorkerTemplate) => {
    setTemplateToDelete(template);
    setDeleteConfirmOpen(true);
  };

  const deleteTemplate = async () => {
    if (!templateToDelete) return;

    try {
      const { data, error } = await supabase.functions.invoke('worker-templates', {
        body: { action: 'delete', userId, templateId: templateToDelete.id }
      });

      if (error) throw error;
      if (data?.success) {
        setTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
        toast.success('删除成功');
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('删除失败');
    } finally {
      setDeleteConfirmOpen(false);
      setTemplateToDelete(null);
    }
  };

  const applyTemplate = async (template: WorkerTemplate) => {
    try {
      // 先复制到剪贴板
      if (onUseTemplate) {
        onUseTemplate(template.script_content);
      } else {
        await navigator.clipboard.writeText(template.script_content);
        toast.success('已复制到剪贴板');
      }

      // 然后增加使用次数（不阻塞用户操作）
      supabase.functions.invoke('worker-templates', {
        body: { action: 'increment_usage', templateId: template.id }
      }).catch(err => console.warn('Failed to increment usage:', err));
    } catch (error) {
      console.error('Failed to copy template:', error);
      toast.error('复制失败，请手动复制');
    }
  };

  const editTemplate = (template: WorkerTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      scriptContent: template.script_content,
      category: template.category,
      isPublic: template.is_public === 1,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      scriptContent: '',
      category: 'general',
      isPublic: false,
    });
    setEditingTemplate(null);
  };

  const filteredTemplates = selectedCategory === 'all'
    ? templates
    : templates.filter(t => t.category === selectedCategory);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="w-5 h-5" />
              Worker 脚本模板库
            </CardTitle>
            <CardDescription>保存和复用常用的 Worker 脚本</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                新建模板
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{editingTemplate ? '编辑模板' : '新建模板'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>模板名称</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="输入模板名称"
                  />
                </div>
                <div>
                  <Label>描述</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="输入模板描述（可选）"
                  />
                </div>
                <div>
                  <Label>分类</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>脚本内容</Label>
                  <Textarea
                    value={formData.scriptContent}
                    onChange={(e) => setFormData(prev => ({ ...prev, scriptContent: e.target.value }))}
                    placeholder="输入 Worker 脚本代码"
                    className="font-mono text-sm min-h-[300px]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.isPublic}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPublic: checked }))}
                  />
                  <Label>公开模板（其他用户可见）</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleSubmit}>
                    {editingTemplate ? '更新' : '创建'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="选择分类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部分类</SelectItem>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="h-[500px]">
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">加载中...</p>
          ) : filteredTemplates.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">暂无模板</p>
          ) : (
            <div className="grid gap-4">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{template.name}</h3>
                        <Badge variant="outline">{template.category}</Badge>
                        {template.is_public === 1 && <Badge>公开</Badge>}
                      </div>
                      {template.description && (
                        <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <TrendingUp className="w-3 h-3" />
                        使用 {template.usage_count} 次
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applyTemplate(template)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      {template.user_id === userId && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => editTemplate(template)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => confirmDelete(template)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <pre className="text-xs bg-muted p-3 rounded max-h-40 overflow-y-auto whitespace-pre-wrap break-words">
                    <code>{template.script_content}</code>
                  </pre>
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
              您确定要删除模板 "{templateToDelete?.name}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={deleteTemplate}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
