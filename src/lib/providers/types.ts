export type ProviderId = "cloudflare" | "edgeone" | "esa";

export type ProviderCredentials =
  | { provider: "cloudflare"; email: string; apiKey: string }
  | { provider: "edgeone"; secretId: string; secretKey: string }
  | { provider: "esa"; accessKeyId: string; accessKeySecret: string };

export interface Zone {
  id: string;
  name: string;
  status: string;
  provider: ProviderId;
  raw?: unknown;
}

export interface DnsRecord {
  id: string;
  zoneId: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied?: boolean;
}

export interface KvNamespace {
  id: string;
  title: string;
}

export interface KvKey {
  name: string;
}

export interface WorkerScript {
  id: string;
  modifiedOn: string;
}

export interface Certificate {
  id: string;
  hosts: string[];
  expiresOn: string;
  status: string;
}

export interface PageRule {
  id: string;
  zoneId: string;
  status: "active" | "disabled";
  priority?: number;
  rawTargets: unknown;
  rawActions: unknown;
}
