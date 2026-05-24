import type { WorkersCapability } from "../capabilities/workers";
import type { ProviderCredentials, WorkerScript } from "../types";
import { callEdgeOne } from "./_invoke";
import { edgeoneZones } from "./zones";

const EDGE_FUNCTION_PAGE_SIZE = 200;

interface RawFunction {
  FunctionId: string;
  ZoneId: string;
  Name: string;
  Content?: string;
  CreateTime?: string;
  UpdateTime?: string;
}

interface DescribeFunctionsResponse {
  Functions: RawFunction[];
  TotalCount: number;
}

function normalizeWorker(raw: RawFunction): WorkerScript {
  return {
    id: raw.Name || raw.FunctionId,
    modifiedOn: raw.UpdateTime || raw.CreateTime || "",
  };
}

async function listFunctionsInZone(creds: ProviderCredentials, zoneId: string) {
  const functions: RawFunction[] = [];
  let offset = 0;

  while (true) {
    const result = await callEdgeOne<DescribeFunctionsResponse>(
      "DescribeFunctions",
      creds,
      { ZoneId: zoneId, Offset: offset, Limit: EDGE_FUNCTION_PAGE_SIZE },
    );
    const page = result.Functions ?? [];
    functions.push(...page);

    if (
      page.length === 0 ||
      page.length < EDGE_FUNCTION_PAGE_SIZE ||
      functions.length >= result.TotalCount
    ) {
      break;
    }

    offset += page.length;
  }

  return functions;
}

async function listFunctions(creds: ProviderCredentials) {
  const zones = await edgeoneZones.list(creds);
  const functions: RawFunction[] = [];

  for (const zone of zones) {
    functions.push(...(await listFunctionsInZone(creds, zone.id)));
  }

  return functions;
}

async function findFunction(creds: ProviderCredentials, scriptName: string) {
  return (await listFunctions(creds)).find(
    (fn) => fn.Name === scriptName || fn.FunctionId === scriptName,
  );
}

export const edgeoneWorkers: WorkersCapability = {
  async list(creds) {
    return (await listFunctions(creds)).map(normalizeWorker);
  },

  async getScript(creds, scriptName) {
    return (await findFunction(creds, scriptName))?.Content ?? "";
  },

  async putScript(creds, scriptName, source) {
    const fn = await findFunction(creds, scriptName);
    if (!fn) return;

    await callEdgeOne<unknown>("ModifyFunction", creds, {
      ZoneId: fn.ZoneId,
      FunctionId: fn.FunctionId,
      Content: source,
    });
  },

  async deleteScript(creds, scriptName) {
    const fn = await findFunction(creds, scriptName);
    if (!fn) return;

    await callEdgeOne<unknown>("DeleteFunction", creds, {
      ZoneId: fn.ZoneId,
      FunctionId: fn.FunctionId,
    });
  },
};
