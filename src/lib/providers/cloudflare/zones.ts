import type { ZonesCapability } from "../capabilities/zones";
import type { ProviderCredentials, Zone } from "../types";
import { callCloudflare } from "./_invoke";

interface RawZone {
  id: string;
  name: string;
  status: string;
}

function normalizeZone(raw: RawZone): Zone {
  return {
    id: raw.id,
    name: raw.name,
    status: raw.status,
    provider: "cloudflare",
    raw,
  };
}

export const cloudflareZones: ZonesCapability = {
  async list(creds: ProviderCredentials) {
    const result = await callCloudflare<RawZone[]>("list_zones", creds);
    return result.map(normalizeZone);
  },

  async create(creds: ProviderCredentials, name: string) {
    const result = await callCloudflare<RawZone>("create_zone", creds, {
      data: { name },
    });
    return normalizeZone(result);
  },

  async delete(creds: ProviderCredentials, zoneId: string) {
    await callCloudflare<unknown>("delete_zone", creds, { zoneId });
  },
};
