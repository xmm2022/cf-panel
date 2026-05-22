import type { KvCapability } from "../capabilities/kv";
import type { KvKey, KvNamespace, ProviderCredentials } from "../types";
import { callCloudflare } from "./_invoke";

export const cloudflareKv: KvCapability = {
  async listNamespaces(creds: ProviderCredentials) {
    return callCloudflare<KvNamespace[]>("list_kv_namespaces", creds);
  },

  async listKeys(creds: ProviderCredentials, namespaceId: string) {
    return callCloudflare<KvKey[]>("list_kv_keys", creds, { namespaceId });
  },

  async putValue(
    creds: ProviderCredentials,
    namespaceId: string,
    key: string,
    value: string,
  ) {
    await callCloudflare<unknown>("write_kv_value", creds, {
      namespaceId,
      keyName: key,
      value,
    });
  },

  async getValue(creds: ProviderCredentials, namespaceId: string, key: string) {
    return callCloudflare<string>("read_kv_value", creds, {
      namespaceId,
      keyName: key,
    });
  },

  async deleteKey(creds: ProviderCredentials, namespaceId: string, key: string) {
    await callCloudflare<unknown>("delete_kv_key", creds, {
      namespaceId,
      keyName: key,
    });
  },
};
