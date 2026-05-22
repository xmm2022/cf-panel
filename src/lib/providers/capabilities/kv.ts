import type { KvKey, KvNamespace, ProviderCredentials } from "../types";

export interface KvCapability {
  listNamespaces(creds: ProviderCredentials): Promise<KvNamespace[]>;
  listKeys(creds: ProviderCredentials, namespaceId: string): Promise<KvKey[]>;
  putValue(
    creds: ProviderCredentials,
    namespaceId: string,
    key: string,
    value: string,
  ): Promise<void>;
  getValue(
    creds: ProviderCredentials,
    namespaceId: string,
    key: string,
  ): Promise<string>;
  deleteKey(
    creds: ProviderCredentials,
    namespaceId: string,
    key: string,
  ): Promise<void>;
}
