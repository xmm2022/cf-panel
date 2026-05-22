import { invokeProviderApi } from "@/lib/cloudflare-worker-api";
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

const ACCOUNT_SCOPED_ACTIONS = new Set([
  "get_account",
  "get_workers_subdomain",
  "list_workers",
  "get_worker_script",
  "upload_worker",
  "delete_worker",
  "list_kv_namespaces",
  "create_kv_namespace",
  "delete_kv_namespace",
  "list_kv_keys",
  "read_kv_value",
  "write_kv_value",
  "delete_kv_key",
  "list_d1_databases",
  "execute_d1_query",
  "list_r2_buckets",
  "list_tunnels",
  "list_pages_projects",
]);

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

async function getDefaultAccountId(creds: ProviderCredentials): Promise<string> {
  const zones = await callCloudflare<Array<{ account?: { id?: string } }>>(
    "list_zones",
    creds,
  );
  const accountId = zones.find((zone) => zone.account?.id)?.account?.id;

  if (!accountId) {
    throw new ProviderError(
      "cloudflare",
      "NOT_FOUND",
      "Cloudflare account id not found",
    );
  }

  return accountId;
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

  const requestBody = {
    action,
    ...extra,
  };

  if (
    ACCOUNT_SCOPED_ACTIONS.has(action) &&
    typeof requestBody.accountId !== "string"
  ) {
    requestBody.accountId = await getDefaultAccountId(creds);
  }

  const { data, error } = await invokeProviderApi<WrappedCloudflareEnvelope<T>>(
    "auto",
    requestBody,
    creds,
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
