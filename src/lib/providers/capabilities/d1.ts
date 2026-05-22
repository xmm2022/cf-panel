import type { ProviderCredentials } from "../types";

export interface D1Database {
  uuid: string;
  name: string;
  createdAt: string;
}

export interface D1Capability {
  listDatabases(creds: ProviderCredentials): Promise<D1Database[]>;
  query(
    creds: ProviderCredentials,
    databaseId: string,
    sql: string,
  ): Promise<unknown>;
}
