import type { KvCapability } from "../capabilities/kv";
import { ProviderError } from "../errors";
import type { KvKey, KvNamespace, ProviderCredentials } from "../types";
import { callEdgeOne } from "./_invoke";

interface RawNamespace {
  Namespace?: string;
  Remark?: string;
}

interface DescribeEdgeKVNamespacesResponse {
  KVNamespaces?: RawNamespace[];
  TotalCount?: number;
}

interface EdgeKVListResponse {
  Keys?: string[];
  Cursor?: string;
}

interface EdgeKVGetResponse {
  Data?: Array<{
    Key?: string;
    Value?: string;
  }>;
}

function requireZoneId(zoneId: string | undefined): string {
  if (!zoneId) {
    throw new ProviderError(
      "edgeone",
      "NOT_FOUND",
      "EdgeOne KV requires a selected zone",
    );
  }

  return zoneId;
}

function normalizeNamespace(raw: RawNamespace): KvNamespace {
  const namespace = raw.Namespace ?? "";
  return {
    id: namespace,
    title: namespace,
  };
}

export const edgeoneKv: KvCapability = {
  async listNamespaces(creds: ProviderCredentials, options) {
    const zoneId = requireZoneId(options?.zoneId);
    const result = await callEdgeOne<DescribeEdgeKVNamespacesResponse>(
      "DescribeEdgeKVNamespaces",
      creds,
      { ZoneId: zoneId, Offset: 0, Limit: 1000 },
    );
    return (result.KVNamespaces ?? []).map(normalizeNamespace);
  },

  async createNamespace(creds: ProviderCredentials, name: string, options) {
    const zoneId = requireZoneId(options?.zoneId);
    await callEdgeOne<unknown>("CreateEdgeKVNamespace", creds, {
      ZoneId: zoneId,
      Namespace: name,
    });
    return { id: name, title: name };
  },

  async deleteNamespace(creds: ProviderCredentials, namespaceId: string, options) {
    const zoneId = requireZoneId(options?.zoneId);
    await callEdgeOne<unknown>("DeleteEdgeKVNamespace", creds, {
      ZoneId: zoneId,
      Namespace: namespaceId,
    });
  },

  async listKeys(creds: ProviderCredentials, namespaceId: string, options) {
    const zoneId = requireZoneId(options?.zoneId);
    const result = await callEdgeOne<EdgeKVListResponse>(
      "EdgeKVList",
      creds,
      { ZoneId: zoneId, Namespace: namespaceId, Limit: 1000 },
    );
    return (result.Keys ?? []).map<KvKey>((key) => ({ name: key }));
  },

  async putValue(
    creds: ProviderCredentials,
    namespaceId: string,
    key: string,
    value: string,
    options,
  ) {
    const zoneId = requireZoneId(options?.zoneId);
    await callEdgeOne<unknown>("EdgeKVPut", creds, {
      ZoneId: zoneId,
      Namespace: namespaceId,
      Key: key,
      Value: value,
    });
  },

  async getValue(creds: ProviderCredentials, namespaceId: string, key: string, options) {
    const zoneId = requireZoneId(options?.zoneId);
    const result = await callEdgeOne<EdgeKVGetResponse>("EdgeKVGet", creds, {
      ZoneId: zoneId,
      Namespace: namespaceId,
      Keys: [key],
    });
    return result.Data?.[0]?.Value ?? "";
  },

  async deleteKey(creds: ProviderCredentials, namespaceId: string, key: string, options) {
    const zoneId = requireZoneId(options?.zoneId);
    await callEdgeOne<unknown>("EdgeKVDelete", creds, {
      ZoneId: zoneId,
      Namespace: namespaceId,
      Keys: [key],
    });
  },
};
