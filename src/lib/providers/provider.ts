import type { AnalyticsCapability } from "./capabilities/analytics";
import type { CertificatesCapability } from "./capabilities/certificates";
import type { D1Capability } from "./capabilities/d1";
import type { DnsCapability } from "./capabilities/dns";
import type { KvCapability } from "./capabilities/kv";
import type { PageRulesCapability } from "./capabilities/page-rules";
import type { PagesCapability } from "./capabilities/pages";
import type { R2Capability } from "./capabilities/r2";
import type { TunnelsCapability } from "./capabilities/tunnels";
import type { WorkersCapability } from "./capabilities/workers";
import type { ZonesCapability } from "./capabilities/zones";
import type { ProviderId } from "./types";

export interface CloudProviderCapabilities {
  zones?: ZonesCapability;
  dns?: DnsCapability;
  pageRules?: PageRulesCapability;
  workers?: WorkersCapability;
  kv?: KvCapability;
  certificates?: CertificatesCapability;
  analytics?: AnalyticsCapability;
  pages?: PagesCapability;
  r2?: R2Capability;
  d1?: D1Capability;
  tunnels?: TunnelsCapability;
}

export interface CloudProvider {
  id: ProviderId;
  label: string;
  capabilities: CloudProviderCapabilities;
}
