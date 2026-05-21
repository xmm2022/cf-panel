// Supabase 到 Cloudflare Worker 的适配器
// 所有请求都通过外部 Cloudflare Worker API，不使用 Lovable Cloud 后端

import { invokeWorkerApi } from './cloudflare-worker-api';

interface InvokeOptions {
  body?: Record<string, any>;
}

export const supabase = {
  functions: {
    async invoke<T = any>(functionName: string, options?: InvokeOptions) {
      const body = options?.body || {};

      // 所有请求都通过外部 Cloudflare Worker API
      return await invokeWorkerApi<T>(functionName, body);
    }
  }
};
