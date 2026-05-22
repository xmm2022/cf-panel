import type { ProviderCredentials, Zone } from "../types";

export interface ZonesCapability {
  list(creds: ProviderCredentials): Promise<Zone[]>;
  create(creds: ProviderCredentials, name: string): Promise<Zone>;
  delete(creds: ProviderCredentials, zoneId: string): Promise<void>;
}
