import type { CloudProvider } from "../provider";
import { cloudflareDns } from "./dns";
import { cloudflareZones } from "./zones";

export const cloudflareProvider: CloudProvider = {
  id: "cloudflare",
  label: "Cloudflare",
  capabilities: {
    zones: cloudflareZones,
    dns: cloudflareDns,
  },
};
