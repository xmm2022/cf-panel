import type { WorkersCapability } from "../capabilities/workers";
import type { WorkerScript } from "../types";
import { callEdgeOne } from "./_invoke";

interface RawEdgeFunction {
  FunctionId: string;
  FunctionName: string;
  UpdateTime: string;
}

interface DescribeEdgeFunctionsResponse {
  EdgeFunctions: RawEdgeFunction[];
  TotalCount: number;
}

function normalizeWorker(raw: RawEdgeFunction): WorkerScript {
  return {
    id: raw.FunctionName || raw.FunctionId,
    modifiedOn: raw.UpdateTime,
  };
}

export const edgeoneWorkers: WorkersCapability = {
  async list(creds) {
    const result = await callEdgeOne<DescribeEdgeFunctionsResponse>(
      "DescribeEdgeFunctions",
      creds,
      { Limit: 1000 },
    );
    return result.EdgeFunctions.map(normalizeWorker);
  },

  async getScript(creds, scriptName) {
    const result = await callEdgeOne<{ Content: string }>(
      "DescribeEdgeFunctionRuntimeEnvironment",
      creds,
      { FunctionName: scriptName },
    );
    return result.Content;
  },

  async putScript(creds, scriptName, source) {
    await callEdgeOne<unknown>("ModifyEdgeFunction", creds, {
      FunctionName: scriptName,
      Content: source,
    });
  },

  async deleteScript(creds, scriptName) {
    await callEdgeOne<unknown>("DeleteEdgeFunction", creds, {
      FunctionName: scriptName,
    });
  },
};
