// 为历史代码保留的 invoke 兼容层。
// 现有调用最终全部转发到 Cloudflare Worker API。

import { invokeWorkerApi } from './cloudflare-worker-api';

interface InvokeOptions {
  body?: Record<string, unknown>;
}

export const supabase = {
  functions: {
    async invoke<T = unknown>(functionName: string, options?: InvokeOptions) {
      const body = options?.body || {};

      // 所有请求都通过外部 Cloudflare Worker API
      return await invokeWorkerApi<T>(functionName, body);
    }
  }
};
