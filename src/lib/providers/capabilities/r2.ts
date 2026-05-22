import type { ProviderCredentials } from "../types";

export interface R2Bucket {
  name: string;
  creationDate: string;
}

export interface R2Capability {
  listBuckets(creds: ProviderCredentials): Promise<R2Bucket[]>;
}
