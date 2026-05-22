import type { DnsCapability, DnsRecordInput } from "../capabilities/dns";
import type { DnsRecord, ProviderCredentials } from "../types";
import { callEdgeOne } from "./_invoke";

interface RawDnsRecord {
  RecordId: string;
  Type: string;
  Name: string;
  Content: string;
  TTL: number;
}

interface DescribeDnsRecordsResponse {
  DnsRecords: RawDnsRecord[];
  TotalCount: number;
}

interface CreateDnsRecordResponse {
  RecordId: string;
}

function normalizeDnsRecord(zoneId: string, raw: RawDnsRecord): DnsRecord {
  return {
    id: raw.RecordId,
    zoneId,
    type: raw.Type,
    name: raw.Name,
    content: raw.Content,
    ttl: raw.TTL,
    proxied: false,
  };
}

export const edgeoneDns: DnsCapability = {
  async list(creds: ProviderCredentials, zoneId: string) {
    const result = await callEdgeOne<DescribeDnsRecordsResponse>(
      "DescribeDnsRecords",
      creds,
      { ZoneId: zoneId, Limit: 1000 },
    );
    return result.DnsRecords.map((raw) => normalizeDnsRecord(zoneId, raw));
  },

  async create(
    creds: ProviderCredentials,
    zoneId: string,
    record: DnsRecordInput,
  ) {
    const created = await callEdgeOne<CreateDnsRecordResponse>(
      "CreateDnsRecord",
      creds,
      {
        ZoneId: zoneId,
        Name: record.name,
        Type: record.type,
        Content: record.content,
        TTL: record.ttl,
      },
    );
    return { id: created.RecordId, zoneId, ...record };
  },

  async update(
    creds: ProviderCredentials,
    zoneId: string,
    record: DnsRecord,
  ) {
    await callEdgeOne<unknown>("ModifyDnsRecord", creds, {
      ZoneId: zoneId,
      RecordId: record.id,
      Name: record.name,
      Type: record.type,
      Content: record.content,
      TTL: record.ttl,
    });
    return record;
  },

  async delete(
    creds: ProviderCredentials,
    zoneId: string,
    recordId: string,
  ) {
    await callEdgeOne<unknown>("DeleteDnsRecord", creds, {
      ZoneId: zoneId,
      RecordId: recordId,
    });
  },
};
