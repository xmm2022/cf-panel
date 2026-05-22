import type { PageRulesCapability } from "../capabilities/page-rules";
import type { PageRule, ProviderCredentials } from "../types";
import { callCloudflare } from "./_invoke";

interface RawPageRule {
  id: string;
  status: "active" | "disabled";
  priority?: number;
  targets: unknown;
  actions: unknown;
}

function normalizePageRule(zoneId: string, raw: RawPageRule): PageRule {
  return {
    id: raw.id,
    zoneId,
    status: raw.status,
    priority: raw.priority,
    rawTargets: raw.targets,
    rawActions: raw.actions,
  };
}

export const cloudflarePageRules: PageRulesCapability = {
  async list(creds: ProviderCredentials, zoneId: string) {
    const result = await callCloudflare<RawPageRule[]>("list_page_rules", creds, {
      zoneId,
    });
    return result.map((raw) => normalizePageRule(zoneId, raw));
  },

  async create(
    creds: ProviderCredentials,
    zoneId: string,
    rule: Omit<PageRule, "id" | "zoneId">,
  ) {
    const result = await callCloudflare<RawPageRule>("create_page_rule", creds, {
      zoneId,
      ruleData: {
        status: rule.status,
        priority: rule.priority,
        targets: rule.rawTargets,
        actions: rule.rawActions,
      },
    });
    return normalizePageRule(zoneId, result);
  },

  async update(creds: ProviderCredentials, zoneId: string, rule: PageRule) {
    const result = await callCloudflare<RawPageRule>("update_page_rule", creds, {
      zoneId,
      pageRuleId: rule.id,
      ruleData: {
        status: rule.status,
        priority: rule.priority,
        targets: rule.rawTargets,
        actions: rule.rawActions,
      },
    });
    return normalizePageRule(zoneId, result);
  },

  async delete(creds: ProviderCredentials, zoneId: string, ruleId: string) {
    await callCloudflare<unknown>("delete_page_rule", creds, {
      zoneId,
      pageRuleId: ruleId,
    });
  },
};
