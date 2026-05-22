import type { CloudProvider } from "../provider";
import { cloudflareAnalytics } from "./analytics";
import { cloudflareCertificates } from "./certificates";
import { cloudflareD1 } from "./d1";
import { cloudflareDns } from "./dns";
import { cloudflareKv } from "./kv";
import { cloudflarePageRules } from "./page-rules";
import { cloudflarePages } from "./pages";
import { cloudflareR2 } from "./r2";
import { cloudflareTunnels } from "./tunnels";
import { cloudflareWorkers } from "./workers";
import { cloudflareZones } from "./zones";

export const cloudflareProvider: CloudProvider = {
  id: "cloudflare",
  label: "Cloudflare",
  capabilities: {
    zones: cloudflareZones,
    dns: cloudflareDns,
    kv: cloudflareKv,
    workers: cloudflareWorkers,
    pageRules: cloudflarePageRules,
    certificates: cloudflareCertificates,
    analytics: cloudflareAnalytics,
    pages: cloudflarePages,
    r2: cloudflareR2,
    d1: cloudflareD1,
    tunnels: cloudflareTunnels,
  },
};
