import type { DnsRecord, ProviderCredentials } from "../types";

export type DnsRecordInput = Omit<DnsRecord, "id" | "zoneId">;

export interface DnsCapability {
  list(creds: ProviderCredentials, zoneId: string): Promise<DnsRecord[]>;
  create(
    creds: ProviderCredentials,
    zoneId: string,
    record: DnsRecordInput,
  ): Promise<DnsRecord>;
  update(
    creds: ProviderCredentials,
    zoneId: string,
    record: DnsRecord,
  ): Promise<DnsRecord>;
  delete(
    creds: ProviderCredentials,
    zoneId: string,
    recordId: string,
  ): Promise<void>;
}
