import type { KvCapability } from "../capabilities/kv";
import type { KvKey, KvNamespace, ProviderCredentials } from "../types";
import { callEdgeOne } from "./_invoke";

interface RawNamespace {
  NamespaceId: string;
  NamespaceName: string;
}

interface RawKey {
  KeyName: string;
}

export const edgeoneKv: KvCapability = {
  async listNamespaces(creds: ProviderCredentials) {
    const result = await callEdgeOne<{ KvNamespaces: RawNamespace[] }>(
      "DescribeKvNamespaces",
      creds,
      { Limit: 1000 },
    );
    return result.KvNamespaces.map<KvNamespace>((namespace) => ({
      id: namespace.NamespaceId,
      title: namespace.NamespaceName,
    }));
  },

  async listKeys(creds: ProviderCredentials, namespaceId: string) {
    const result = await callEdgeOne<{ Keys: RawKey[] }>(
      "DescribeKvKeys",
      creds,
      { NamespaceId: namespaceId, Limit: 1000 },
    );
    return result.Keys.map<KvKey>((key) => ({ name: key.KeyName }));
  },

  async putValue(
    creds: ProviderCredentials,
    namespaceId: string,
    key: string,
    value: string,
  ) {
    await callEdgeOne<unknown>("WriteKvValue", creds, {
      NamespaceId: namespaceId,
      KeyName: key,
      Value: value,
    });
  },

  async getValue(creds: ProviderCredentials, namespaceId: string, key: string) {
    const result = await callEdgeOne<{ Value: string }>("ReadKvValue", creds, {
      NamespaceId: namespaceId,
      KeyName: key,
    });
    return result.Value;
  },

  async deleteKey(creds: ProviderCredentials, namespaceId: string, key: string) {
    await callEdgeOne<unknown>("DeleteKvKey", creds, {
      NamespaceId: namespaceId,
      KeyName: key,
    });
  },
};
