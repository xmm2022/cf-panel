import type { ProviderCredentials } from "../types";

export interface Tunnel {
  id: string;
  name: string;
  createdAt: string;
  status?: string;
}

export interface TunnelsCapability {
  list(creds: ProviderCredentials): Promise<Tunnel[]>;
}
