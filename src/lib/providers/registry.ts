import { cloudflareProvider } from "./cloudflare";
import type { CloudProvider } from "./provider";
import type { ProviderId } from "./types";

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
