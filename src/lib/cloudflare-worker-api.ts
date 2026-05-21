// Cloudflare Worker API 调用封装（带签名验证）
import { addAuthSignature } from './auth-signature';

const WORKER_API_URL = 'https://YOUR_WORKER_DOMAIN'; // 部署 Worker 后替换为实际域名

interface ApiResponse<T = any> {
  data: T | null;
  error: Error | null;
}

/**
 * 调用 Cloudflare Worker API（自动添加签名）
 * @param endpoint API 端点 (e.g., 'cloudflare-api', 'verify-cloudflare')
 * @param body 请求体
 * @returns API 响应
 */
export async function invokeWorkerApi<T = any>(
  endpoint: string,
  body: Record<string, any>
): Promise<ApiResponse<T>> {
  try {
    // 🔒 自动添加签名头
    const headers = await addAuthSignature({
      'Content-Type': 'application/json',
    });
    
    const response = await fetch(`${WORKER_API_URL}/api/${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // 直接返回 Worker 的响应，让前端自己检查 success 字段
    // 这样保持与 Supabase functions.invoke 的行为一致
    return {
      data: data,
      error: null,
    };
  } catch (error) {
    console.error(`Worker API Error (${endpoint}):`, error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
