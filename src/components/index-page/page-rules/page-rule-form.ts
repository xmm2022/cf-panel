import type { PageRule } from "@/lib/providers/types";
import type {
  PageRuleAction,
  PageRuleFormState,
  PageRuleForwardingValue,
  PageRuleTarget,
} from "./page-rule-types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isForwardingValue(value: unknown): value is PageRuleForwardingValue {
  return (
    isRecord(value) &&
    typeof value.url === "string" &&
    (typeof value.status_code === "number" || typeof value.status_code === "string")
  );
}

function normalizeTarget(value: unknown): PageRuleTarget | null {
  if (!isRecord(value)) return null;
  const constraint = isRecord(value.constraint) ? value.constraint : undefined;
  return {
    target: typeof value.target === "string" ? value.target : undefined,
    constraint: constraint
      ? {
          operator: typeof constraint.operator === "string" ? constraint.operator : undefined,
          value: typeof constraint.value === "string" ? constraint.value : undefined,
        }
      : undefined,
  };
}

function normalizeAction(value: unknown): PageRuleAction | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  return {
    id: value.id,
    value: value.value as PageRuleAction["value"],
  };
}

export const createEmptyPageRuleForm = (): PageRuleFormState => ({
  urlPattern: "",
  cacheLevel: "",
  browserCacheTtl: "",
  securityLevel: "",
  ssl: "",
  alwaysUseHttps: "",
  forwardingType: "",
  forwardingUrl: "",
  status: "active",
});

export function getPageRuleTargets(rule: PageRule): PageRuleTarget[] {
  if (!Array.isArray(rule.rawTargets)) return [];
  return rule.rawTargets
    .map(normalizeTarget)
    .filter((target): target is PageRuleTarget => target !== null);
}

export function getPageRuleActions(rule: PageRule): PageRuleAction[] {
  if (!Array.isArray(rule.rawActions)) return [];
  return rule.rawActions
    .map(normalizeAction)
    .filter((action): action is PageRuleAction => action !== null);
}

export function getPageRuleUrlPattern(rule: PageRule): string {
  const cfPattern = getPageRuleTargets(rule)[0]?.constraint?.value;
  if (cfPattern) return cfPattern;

  if (Array.isArray(rule.rawTargets)) {
    for (const target of rule.rawTargets) {
      if (!isRecord(target)) continue;
      const values = target.Values;
      if (Array.isArray(values) && typeof values[0] === "string") {
        return values[0];
      }
    }
  }

  return "";
}

export const mapRuleToForm = (rule: PageRule): PageRuleFormState => {
  const form = createEmptyPageRuleForm();
  form.status = rule.status;
  form.urlPattern = getPageRuleUrlPattern(rule);

  for (const action of getPageRuleActions(rule)) {
    if (action.id === "cache_level" && typeof action.value === "string") {
      form.cacheLevel = action.value;
    }
    if (action.id === "browser_cache_ttl" && typeof action.value === "number") {
      form.browserCacheTtl = String(action.value);
    }
    if (action.id === "security_level" && typeof action.value === "string") {
      form.securityLevel = action.value;
    }
    if (action.id === "ssl" && typeof action.value === "string") {
      form.ssl = action.value;
    }
    if (action.id === "always_use_https") {
      form.alwaysUseHttps = typeof action.value === "string" ? action.value : "on";
    }
    if (action.id === "forwarding_url" && isForwardingValue(action.value)) {
      form.forwardingType = String(action.value.status_code);
      form.forwardingUrl = action.value.url;
    }
  }

  return form;
};

export function buildPageRuleTargets(form: PageRuleFormState): PageRuleTarget[] {
  return [
    {
      target: "url",
      constraint: {
        operator: "matches",
        value: form.urlPattern.trim(),
      },
    },
  ];
}

export function buildPageRuleActions(form: PageRuleFormState): PageRuleAction[] {
  const actions: PageRuleAction[] = [];
  const hasForwarding = Boolean(form.forwardingType && form.forwardingUrl.trim());
  const hasAlwaysHttps = form.alwaysUseHttps === "on";

  if (hasForwarding) {
    actions.push({
      id: "forwarding_url",
      value: {
        url: form.forwardingUrl.trim(),
        status_code: parseInt(form.forwardingType, 10),
      },
    });
    return actions;
  }

  if (hasAlwaysHttps) {
    actions.push({ id: "always_use_https" });
    return actions;
  }

  if (form.cacheLevel) {
    actions.push({ id: "cache_level", value: form.cacheLevel });
  }

  if (form.browserCacheTtl) {
    actions.push({ id: "browser_cache_ttl", value: parseInt(form.browserCacheTtl, 10) });
  }

  if (form.securityLevel) {
    actions.push({ id: "security_level", value: form.securityLevel });
  }

  if (form.ssl) {
    actions.push({ id: "ssl", value: form.ssl });
  }

  return actions;
}
