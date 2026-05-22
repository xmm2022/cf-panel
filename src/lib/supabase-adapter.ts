// 为历史代码保留的 invoke 兼容层。
// 非 provider 端点继续通过同源 Worker API 调用；provider 鉴权调用走 invokeProviderApi。

interface InvokeOptions {
  body?: Record<string, unknown>;
}

interface ApiResponse<T = unknown> {
  data: T | null;
  error: Error | null;
}

function resolveWorkerApiBaseUrl(): string {
  const configuredUrl = import.meta.env.VITE_WORKER_API_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }

  throw new Error(
    "Missing Worker API base URL. Set VITE_WORKER_API_URL or run the frontend behind the same origin as the Worker."
  );
}

async function invokeWorkerEndpoint<T = unknown>(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${resolveWorkerApiBaseUrl()}/api/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return {
      data: await response.json(),
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

export const supabase = {
  functions: {
    async invoke<T = unknown>(functionName: string, options?: InvokeOptions) {
      const body = options?.body || {};

      // 所有请求都通过外部 Cloudflare Worker API
      return await invokeWorkerEndpoint<T>(functionName, body);
    }
  }
};
