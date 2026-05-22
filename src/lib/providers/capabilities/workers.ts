import type { ProviderCredentials, WorkerScript } from "../types";

export interface WorkersCapability {
  list(creds: ProviderCredentials): Promise<WorkerScript[]>;
  getScript(creds: ProviderCredentials, scriptName: string): Promise<string>;
  putScript(
    creds: ProviderCredentials,
    scriptName: string,
    source: string,
  ): Promise<void>;
  deleteScript(creds: ProviderCredentials, scriptName: string): Promise<void>;
}
