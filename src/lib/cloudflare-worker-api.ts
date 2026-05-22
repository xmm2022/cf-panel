import { encodeProviderAuth } from "./providers/auth-header";
import type { ProviderCredentials } from "./providers/types";

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

function endpointForProvider(provider: ProviderCredentials["provider"]): string {
  switch (provider) {
    case "cloudflare":
      return "cloudflare-api";
    case "edgeone":
      return "edgeone-api";
    case "esa":
      return "esa-api";
  }
}

export async function invokeProviderApi<T = unknown>(
  endpoint: "auto" | string,
  body: Record<string, unknown>,
  credentials: ProviderCredentials,
): Promise<ApiResponse<T>> {
  const resolvedEndpoint =
    endpoint === "auto" ? endpointForProvider(credentials.provider) : endpoint;

  try {
    const response = await fetch(`${resolveWorkerApiBaseUrl()}/api/${resolvedEndpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Provider-Auth": encodeProviderAuth(credentials),
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
    console.error(`Provider API Error (${resolvedEndpoint}):`, error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
