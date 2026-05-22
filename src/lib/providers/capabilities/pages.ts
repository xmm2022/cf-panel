import type { ProviderCredentials } from "../types";

export interface PagesProject {
  id: string;
  name: string;
  subdomain?: string;
  createdOn: string;
  raw?: unknown;
}

export interface PagesCapability {
  list(creds: ProviderCredentials): Promise<PagesProject[]>;
}
