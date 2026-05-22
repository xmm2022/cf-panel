import type { ProviderId } from "./types";

export type ProviderErrorCode =
  | "AUTH_INVALID"
  | "QUOTA_EXCEEDED"
  | "SIGNING_FAILED"
  | "NOT_FOUND"
  | "UNKNOWN";

export class ProviderError extends Error {
  constructor(
    public provider: ProviderId,
    public code: ProviderErrorCode,
    message: string,
    public upstreamCode?: string,
    public raw?: unknown,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
