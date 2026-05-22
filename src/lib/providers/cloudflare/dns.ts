import type { DnsCapability, DnsRecordInput } from "../capabilities/dns";
import type { DnsRecord, ProviderCredentials } from "../types";
import { callCloudflare } from "./_invoke";

interface RawDnsRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied?: boolean;
}

function normalizeDnsRecord(zoneId: string, raw: RawDnsRecord): DnsRecord {
  return {
    id: raw.id,
    zoneId,
    type: raw.type,
    name: raw.name,
    content: raw.content,
    ttl: raw.ttl,
    proxied: raw.proxied,
  };
}

export const cloudflareDns: DnsCapability = {
  async list(creds: ProviderCredentials, zoneId: string) {
    const result = await callCloudflare<RawDnsRecord[]>(
      "list_dns_records",
      creds,
      { zoneId },
    );
    return result.map((raw) => normalizeDnsRecord(zoneId, raw));
  },

  async create(
    creds: ProviderCredentials,
    zoneId: string,
    record: DnsRecordInput,
  ) {
    const result = await callCloudflare<RawDnsRecord>(
      "create_dns_record",
      creds,
      { zoneId, recordData: record },
    );
    return normalizeDnsRecord(zoneId, result);
  },

  async update(
    creds: ProviderCredentials,
    zoneId: string,
    record: DnsRecord,
  ) {
    const result = await callCloudflare<RawDnsRecord>(
      "update_dns_record",
      creds,
      { zoneId, recordId: record.id, recordData: record },
    );
    return normalizeDnsRecord(zoneId, result);
  },

  async delete(
    creds: ProviderCredentials,
    zoneId: string,
    recordId: string,
  ) {
    await callCloudflare<unknown>("delete_dns_record", creds, {
      zoneId,
      recordId,
    });
  },
};
