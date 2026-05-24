import type { PageRulesCapability } from "../capabilities/page-rules";
import { ProviderError } from "../errors";
import type { PageRule } from "../types";
import { callEdgeOne } from "./_invoke";

interface RawRuleCondition {
  Target?: string;
  Operator?: string;
  Values?: string[];
  [key: string]: unknown;
}

interface RawRuleConditionGroup {
  Conditions?: RawRuleCondition[];
}

interface RawRuleContent {
  Conditions?: RawRuleConditionGroup[];
  Actions?: unknown[];
}

interface RawRule {
  RuleId?: string;
  RuleName?: string;
  Status?: "enable" | "disable" | "active" | "disabled";
  Rules?: RawRuleContent[];
  RulePriority?: number;
}

interface DescribeRulesResponse {
  RuleItems?: RawRule[];
  Rules?: RawRule[];
}

function normalize(zoneId: string, raw: RawRule): PageRule {
  const firstRule = raw.Rules?.[0];
  const rawTargets = firstRule?.Conditions?.flatMap((group) => group.Conditions ?? []) ?? [];
  const rawActions = firstRule?.Actions ?? [];

  return {
    id: raw.RuleId ?? "",
    zoneId,
    status: raw.Status === "enable" || raw.Status === "active" ? "active" : "disabled",
    priority: raw.RulePriority,
    rawTargets,
    rawActions,
  };
}

export const edgeonePageRules: PageRulesCapability = {
  async list(creds, zoneId) {
    const result = await callEdgeOne<DescribeRulesResponse>("DescribeRules", creds, {
      ZoneId: zoneId,
    });
    return (result.RuleItems ?? result.Rules ?? []).map((raw) => normalize(zoneId, raw));
  },

  async create() {
    throw new ProviderError(
      "edgeone",
      "UNKNOWN",
      "EdgeOne rule engine create is not mapped to Cloudflare Page Rules",
    );
  },

  async update() {
    throw new ProviderError(
      "edgeone",
      "UNKNOWN",
      "EdgeOne rule engine update is not mapped to Cloudflare Page Rules",
    );
  },

  async delete(creds, zoneId, ruleId) {
    await callEdgeOne<unknown>("DeleteRules", creds, {
      ZoneId: zoneId,
      RuleIds: [ruleId],
    });
  },
};
