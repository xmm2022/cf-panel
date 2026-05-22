import type { ProviderCredentials, ProviderId } from "./types";

const PROVIDERS: readonly ProviderId[] = ["cloudflare", "edgeone", "esa"];

function encodeFields(fields: Record<string, string>): string {
  return Object.entries(fields)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join(";");
}

function decodeFields(segment: string): Record<string, string> {
  const fields: Record<string, string> = {};

  for (const part of segment.split(";")) {
    if (!part) {
      continue;
    }

    const separatorIndex = part.indexOf("=");
    if (separatorIndex === -1) {
      throw new Error(`malformed auth header segment: ${part}`);
    }

    const key = part.slice(0, separatorIndex);
    const value = decodeURIComponent(part.slice(separatorIndex + 1));
    fields[key] = value;
  }

  return fields;
}

export function encodeProviderAuth(credentials: ProviderCredentials): string {
  switch (credentials.provider) {
    case "cloudflare":
      return `cloudflare ${encodeFields({
        email: credentials.email,
        key: credentials.apiKey,
      })}`;
    case "edgeone":
      return `edgeone ${encodeFields({
        secretId: credentials.secretId,
        secretKey: credentials.secretKey,
      })}`;
    case "esa":
      return `esa ${encodeFields({
        accessKeyId: credentials.accessKeyId,
        accessKeySecret: credentials.accessKeySecret,
      })}`;
  }
}

export function parseProviderAuth(header: string): ProviderCredentials {
  const spaceIndex = header.indexOf(" ");
  if (spaceIndex === -1) {
    throw new Error("malformed auth header: missing provider token");
  }

  const provider = header.slice(0, spaceIndex) as ProviderId;
  if (!PROVIDERS.includes(provider)) {
    throw new Error(`unknown provider: ${provider}`);
  }

  const fields = decodeFields(header.slice(spaceIndex + 1));

  switch (provider) {
    case "cloudflare":
      if (!fields.email || !fields.key) {
        throw new Error("malformed cloudflare auth");
      }
      return { provider, email: fields.email, apiKey: fields.key };
    case "edgeone":
      if (!fields.secretId || !fields.secretKey) {
        throw new Error("malformed edgeone auth");
      }
      return {
        provider,
        secretId: fields.secretId,
        secretKey: fields.secretKey,
      };
    case "esa":
      if (!fields.accessKeyId || !fields.accessKeySecret) {
        throw new Error("malformed esa auth");
      }
      return {
        provider,
        accessKeyId: fields.accessKeyId,
        accessKeySecret: fields.accessKeySecret,
      };
  }
}
