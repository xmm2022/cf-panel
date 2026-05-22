import type { Tunnel, TunnelsCapability } from "../capabilities/tunnels";
import type { ProviderCredentials } from "../types";
import { callCloudflare } from "./_invoke";

interface RawTunnel {
  id: string;
  name: string;
  created_at: string;
  status?: string;
}

function normalizeTunnel(raw: RawTunnel): Tunnel {
  return {
    id: raw.id,
    name: raw.name,
    createdAt: raw.created_at,
    status: raw.status,
  };
}

export const cloudflareTunnels: TunnelsCapability = {
  async list(creds: ProviderCredentials) {
    const result = await callCloudflare<RawTunnel[]>("list_tunnels", creds);
    return result.map(normalizeTunnel);
  },
};
