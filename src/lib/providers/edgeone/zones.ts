import type { ZonesCapability } from "../capabilities/zones";
import type { ProviderCredentials, Zone } from "../types";
import { callEdgeOne } from "./_invoke";

interface RawZone {
  ZoneId: string;
  ZoneName: string;
  Status: string;
}

interface DescribeZonesResponse {
  Zones: RawZone[];
  TotalCount: number;
}

interface CreateZoneResponse {
  ZoneId: string;
}

function normalizeZone(raw: RawZone): Zone {
  return {
    id: raw.ZoneId,
    name: raw.ZoneName,
    status: raw.Status,
    provider: "edgeone",
    raw,
  };
}

export const edgeoneZones: ZonesCapability = {
  async list(creds: ProviderCredentials) {
    const result = await callEdgeOne<DescribeZonesResponse>(
      "DescribeZones",
      creds,
      { Limit: 1000 },
    );
    return result.Zones.map(normalizeZone);
  },

  async create(creds: ProviderCredentials, name: string) {
    const created = await callEdgeOne<CreateZoneResponse>("CreateZone", creds, {
      ZoneName: name,
      Type: "full",
    });
    return {
      id: created.ZoneId,
      name,
      status: "pending",
      provider: "edgeone",
    };
  },

  async delete(creds: ProviderCredentials, zoneId: string) {
    await callEdgeOne<unknown>("DeleteZone", creds, { ZoneId: zoneId });
  },
};
