import type { CloudProvider } from "../provider";
import { edgeoneDns } from "./dns";
import { edgeoneKv } from "./kv";
import { edgeoneZones } from "./zones";

export const edgeoneProvider: CloudProvider = {
  id: "edgeone",
  label: "腾讯云 EdgeOne",
  capabilities: {
    zones: edgeoneZones,
    dns: edgeoneDns,
    kv: edgeoneKv,
  },
};
