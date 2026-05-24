import type { KvKey, KvNamespace, ProviderCredentials } from "../types";

export interface KvOperationOptions {
  zoneId?: string;
}

export interface KvCapability {
  listNamespaces(
    creds: ProviderCredentials,
    options?: KvOperationOptions,
  ): Promise<KvNamespace[]>;
  createNamespace?(
    creds: ProviderCredentials,
    name: string,
    options?: KvOperationOptions,
  ): Promise<KvNamespace>;
  deleteNamespace?(
    creds: ProviderCredentials,
    namespaceId: string,
    options?: KvOperationOptions,
  ): Promise<void>;
  listKeys(
    creds: ProviderCredentials,
    namespaceId: string,
    options?: KvOperationOptions,
  ): Promise<KvKey[]>;
  putValue(
    creds: ProviderCredentials,
    namespaceId: string,
    key: string,
    value: string,
    options?: KvOperationOptions,
  ): Promise<void>;
  getValue(
    creds: ProviderCredentials,
    namespaceId: string,
    key: string,
    options?: KvOperationOptions,
  ): Promise<string>;
  deleteKey(
    creds: ProviderCredentials,
    namespaceId: string,
    key: string,
    options?: KvOperationOptions,
  ): Promise<void>;
}
