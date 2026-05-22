import type { PageRulesCapability } from "../capabilities/page-rules";
import type { PageRule } from "../types";
import { callEdgeOne } from "./_invoke";

interface RawRule {
  RuleId: string;
  Status: "active" | "disabled";
  Conditions: unknown;
  Actions: unknown;
}

interface DescribeRulesResponse {
  Rules: RawRule[];
  TotalCount: number;
}

function normalize(zoneId: string, raw: RawRule): PageRule {
  return {
    id: raw.RuleId,
    zoneId,
    status: raw.Status,
    rawTargets: raw.Conditions,
    rawActions: raw.Actions,
  };
}

export const edgeonePageRules: PageRulesCapability = {
  async list(creds, zoneId) {
    const result = await callEdgeOne<DescribeRulesResponse>("DescribeRules", creds, {
      ZoneId: zoneId,
      Limit: 1000,
    });
    return result.Rules.map((raw) => normalize(zoneId, raw));
  },

  async create(creds, zoneId, rule) {
    const created = await callEdgeOne<{ RuleId: string }>("CreateRule", creds, {
      ZoneId: zoneId,
      Status: rule.status,
      Conditions: rule.rawTargets,
      Actions: rule.rawActions,
    });
    return {
      id: created.RuleId,
      zoneId,
      status: rule.status,
      rawTargets: rule.rawTargets,
      rawActions: rule.rawActions,
    };
  },

  async update(creds, zoneId, rule) {
    await callEdgeOne<unknown>("ModifyRule", creds, {
      ZoneId: zoneId,
      RuleId: rule.id,
      Status: rule.status,
      Conditions: rule.rawTargets,
      Actions: rule.rawActions,
    });
    return rule;
  },

  async delete(creds, zoneId, ruleId) {
    await callEdgeOne<unknown>("DeleteRule", creds, {
      ZoneId: zoneId,
      RuleIds: [ruleId],
    });
  },
};
