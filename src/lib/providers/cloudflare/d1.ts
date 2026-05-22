import type { D1Capability, D1Database } from "../capabilities/d1";
import type { ProviderCredentials } from "../types";
import { callCloudflare } from "./_invoke";

interface RawD1Database {
  uuid: string;
  name: string;
  created_at: string;
}

function normalizeDatabase(raw: RawD1Database): D1Database {
  return {
    uuid: raw.uuid,
    name: raw.name,
    createdAt: raw.created_at,
  };
}

export const cloudflareD1: D1Capability = {
  async listDatabases(creds: ProviderCredentials) {
    const result = await callCloudflare<RawD1Database[]>(
      "list_d1_databases",
      creds,
    );
    return result.map(normalizeDatabase);
  },

  async query(creds: ProviderCredentials, databaseId: string, sql: string) {
    return callCloudflare<unknown>("execute_d1_query", creds, {
      databaseId,
      sql,
    });
  },
};
