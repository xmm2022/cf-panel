import type { CloudProvider } from "../provider";
import { edgeoneAnalytics } from "./analytics";
import { edgeoneCertificates } from "./certificates";
import { edgeoneDns } from "./dns";
import { edgeoneKv } from "./kv";
import { edgeonePageRules } from "./page-rules";
import { edgeoneWorkers } from "./workers";
import { edgeoneZones } from "./zones";

export const edgeoneProvider: CloudProvider = {
  id: "edgeone",
  label: "腾讯云 EdgeOne",
  capabilities: {
    zones: edgeoneZones,
    dns: edgeoneDns,
    analytics: edgeoneAnalytics,
    kv: edgeoneKv,
    pageRules: edgeonePageRules,
    workers: edgeoneWorkers,
    certificates: edgeoneCertificates,
  },
};
