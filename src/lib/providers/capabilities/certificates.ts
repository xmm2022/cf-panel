import type { Certificate, ProviderCredentials } from "../types";

export interface CertificatesCapability {
  list(creds: ProviderCredentials, zoneId: string): Promise<Certificate[]>;
}
