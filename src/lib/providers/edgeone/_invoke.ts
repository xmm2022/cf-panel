import { invokeProviderApi } from "@/lib/cloudflare-worker-api";
import { ProviderError, type ProviderErrorCode } from "../errors";
import type { ProviderCredentials } from "../types";

interface EdgeOneError {
  Code: string;
  Message: string;
}

interface EdgeOneEnvelope<T> {
  Response: T & {
    Error?: EdgeOneError;
    RequestId: string;
  };
}

function mapErrorCode(tcCode: string | undefined): ProviderErrorCode {
  if (!tcCode) return "UNKNOWN";
  if (tcCode.startsWith("AuthFailure")) return "AUTH_INVALID";
  if (tcCode === "ResourceNotFound" || tcCode.endsWith(".NotFound")) {
    return "NOT_FOUND";
  }
  if (
    tcCode.startsWith("RequestLimitExceeded") ||
    tcCode.startsWith("LimitExceeded")
  ) {
    return "QUOTA_EXCEEDED";
  }
  return "UNKNOWN";
}

export async function callEdgeOne<T>(
  action: string,
  creds: ProviderCredentials,
  payload: Record<string, unknown> = {},
): Promise<T> {
  if (creds.provider !== "edgeone") {
    throw new ProviderError(
      "edgeone",
      "AUTH_INVALID",
      `expected edgeone creds, got ${creds.provider}`,
    );
  }

  const { data, error } = await invokeProviderApi<EdgeOneEnvelope<T>>(
    "auto",
    { action, payload },
    creds,
  );

  if (error) {
    throw new ProviderError("edgeone", "UNKNOWN", error.message);
  }

  if (!data) {
    throw new ProviderError("edgeone", "UNKNOWN", "empty response");
  }

  const response = data.Response;
  if (response?.Error) {
    throw new ProviderError(
      "edgeone",
      mapErrorCode(response.Error.Code),
      response.Error.Message,
      response.Error.Code,
      response,
    );
  }

  return response as T;
}
