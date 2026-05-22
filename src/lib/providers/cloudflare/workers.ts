import type { WorkersCapability } from "../capabilities/workers";
import type { ProviderCredentials, WorkerScript } from "../types";
import { callCloudflare } from "./_invoke";

interface RawWorkerScript {
  id: string;
  modified_on: string;
}

function normalizeWorker(raw: RawWorkerScript): WorkerScript {
  return {
    id: raw.id,
    modifiedOn: raw.modified_on,
  };
}

export const cloudflareWorkers: WorkersCapability = {
  async list(creds: ProviderCredentials) {
    const result = await callCloudflare<RawWorkerScript[]>("list_workers", creds);
    return result.map(normalizeWorker);
  },

  async getScript(creds: ProviderCredentials, scriptName: string) {
    return callCloudflare<string>("get_worker_script", creds, { scriptName });
  },

  async putScript(
    creds: ProviderCredentials,
    scriptName: string,
    source: string,
  ) {
    await callCloudflare<unknown>("upload_worker", creds, {
      scriptName,
      data: { script: source },
    });
  },

  async deleteScript(creds: ProviderCredentials, scriptName: string) {
    await callCloudflare<unknown>("delete_worker", creds, { scriptName });
  },
};
