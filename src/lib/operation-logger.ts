import { supabase } from "@/lib/supabase-adapter";

export interface OperationLog {
  userId: string;
  operationType: 'create' | 'update' | 'delete' | 'deploy' | 'purge' | 'other';
  resourceType: 'dns_record' | 'worker' | 'zone' | 'tunnel' | 'page_rule' | 'firewall_rule' | 'kv_namespace' | 'd1_database' | 'r2_bucket' | 'other';
  resourceName?: string;
  zoneId?: string;
  actionDetails?: string;
  status?: 'success' | 'failed';
  errorMessage?: string;
}

/**
 * 记录操作到操作历史
 * @param operation 操作信息
 * @returns Promise<boolean> 是否记录成功
 */
export async function recordOperation(operation: OperationLog): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('operation-history', {
      body: {
        action: 'create',
        userId: operation.userId,
        operationType: operation.operationType,
        resourceType: operation.resourceType,
        resourceName: operation.resourceName,
        zoneId: operation.zoneId,
        actionDetails: operation.actionDetails,
        status: operation.status || 'success',
        errorMessage: operation.errorMessage,
      }
    });

    if (error) {
      console.error('Failed to record operation:', error);
      return false;
    }

    return data?.success || false;
  } catch (error) {
    console.error('Failed to record operation:', error);
    return false;
  }
}
