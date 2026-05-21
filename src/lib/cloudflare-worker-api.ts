// Cloudflare Worker API 调用封装
// 默认使用 VITE_WORKER_API_URL；未设置时回退到当前站点同源地址。

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

export async function invokeWorkerApi<T = unknown>(
  endpoint: string,
  body: Record<string, unknown>
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
