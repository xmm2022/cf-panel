import type { PageRule, ProviderCredentials } from "../types";

export interface PageRulesCapability {
  list(creds: ProviderCredentials, zoneId: string): Promise<PageRule[]>;
  create(
    creds: ProviderCredentials,
    zoneId: string,
    rule: Omit<PageRule, "id" | "zoneId">,
  ): Promise<PageRule>;
  update(
    creds: ProviderCredentials,
    zoneId: string,
    rule: PageRule,
  ): Promise<PageRule>;
  delete(
    creds: ProviderCredentials,
    zoneId: string,
    ruleId: string,
  ): Promise<void>;
}
