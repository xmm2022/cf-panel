import { invokeWorkerApi } from "@/lib/cloudflare-worker-api";
import { ProviderError, type ProviderErrorCode } from "../errors";
import type { ProviderCredentials } from "../types";

interface CloudflareError {
  code?: number;
  message: string;
}

interface CloudflareEnvelope<T> {
  success: boolean;
  errors?: CloudflareError[];
  result?: T;
}

type WrappedCloudflareEnvelope<T> =
  | CloudflareEnvelope<T>
  | { data?: CloudflareEnvelope<T> };

function mapErrorCode(code: number | undefined): ProviderErrorCode {
  if (code === 10000 || code === 9106 || code === 6003) {
    return "AUTH_INVALID";
  }
  if (code === 7003 || code === 7000) {
    return "NOT_FOUND";
  }
  if (code === 10013 || code === 81057) {
    return "QUOTA_EXCEEDED";
  }
  return "UNKNOWN";
}

function unwrapEnvelope<T>(
  response: WrappedCloudflareEnvelope<T> | null,
): CloudflareEnvelope<T> | undefined {
  if (!response) {
    return undefined;
  }

  if ("success" in response) {
    return response;
  }

  return response.data;
}

export async function callCloudflare<T>(
  action: string,
  creds: ProviderCredentials,
  extra: Record<string, unknown> = {},
): Promise<T> {
  if (creds.provider !== "cloudflare") {
    throw new ProviderError(
      "cloudflare",
      "AUTH_INVALID",
      `expected cloudflare creds, got ${creds.provider}`,
    );
  }

  const { data, error } = await invokeWorkerApi<WrappedCloudflareEnvelope<T>>(
    "cloudflare-api",
    {
      action,
      email: creds.email,
      apiKey: creds.apiKey,
      ...extra,
    },
  );

  if (error) {
    throw new ProviderError("cloudflare", "UNKNOWN", error.message);
  }

  const envelope = unwrapEnvelope(data);
  if (!envelope || envelope.success === false) {
    const firstError = envelope?.errors?.[0];
    throw new ProviderError(
      "cloudflare",
      mapErrorCode(firstError?.code),
      firstError?.message ?? "Cloudflare API error",
      firstError?.code !== undefined ? String(firstError.code) : undefined,
      envelope,
    );
  }

  return envelope.result as T;
}
