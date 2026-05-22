import type { CloudProvider } from "./provider";
import type { ProviderId } from "./types";

const cloudflareProvider: CloudProvider = {
  id: "cloudflare",
  label: "Cloudflare",
  capabilities: {},
};

const edgeoneProvider: CloudProvider = {
  id: "edgeone",
  label: "腾讯云 EdgeOne",
  capabilities: {},
};

const esaProvider: CloudProvider = {
  id: "esa",
  label: "阿里云 ESA",
  capabilities: {},
};

export const providers: Record<ProviderId, CloudProvider> = {
  cloudflare: cloudflareProvider,
  edgeone: edgeoneProvider,
  esa: esaProvider,
};
