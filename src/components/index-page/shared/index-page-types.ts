export interface D1DatabaseSummary {
  uuid: string;
  name: string;
  version?: string;
  created_at: string;
}

export interface R2BucketSummary {
  name: string;
  creation_date: string;
  location?: string;
}

export interface R2ObjectSummary {
  key: string;
  size?: number;
  uploaded?: string;
}

export interface TunnelConnection {
  id?: string;
  colo_name?: string;
  client_ip?: string;
}

export interface TunnelSummary {
  id: string;
  name: string;
  created_at: string;
  status?: string;
  deleted_at?: string | null;
  connections?: TunnelConnection[];
}

export interface CertificateSummary {
  id: string;
  hosts?: string[];
  expires_on: string;
  status: string;
}

export interface KVNamespaceSummary {
  id: string;
  title: string;
}

export interface KVKeySummary {
  name: string;
}

export interface D1QueryResult {
  results?: Array<Record<string, unknown>>;
  result?: Array<Record<string, unknown>>;
  meta?: {
    duration?: number;
    changes?: number;
  };
}
