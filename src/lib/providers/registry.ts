import { cloudflareProvider } from "./cloudflare";
import { edgeoneProvider } from "./edgeone";
import type { CloudProvider } from "./provider";
import type { ProviderId } from "./types";

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
