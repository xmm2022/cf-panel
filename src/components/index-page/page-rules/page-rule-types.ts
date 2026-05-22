import type { PageRule } from "@/lib/providers/types";

export interface PageRuleForwardingValue {
  status_code: number;
  url: string;
}

export interface PageRuleAction {
  id: string;
  value?: string | number | PageRuleForwardingValue | Record<string, unknown>;
}

export interface PageRuleTarget {
  target?: string;
  constraint?: {
    operator?: string;
    value?: string;
  };
}

export interface PageRuleFormState {
  urlPattern: string;
  cacheLevel: string;
  browserCacheTtl: string;
  securityLevel: string;
  ssl: string;
  alwaysUseHttps: string;
  forwardingType: string;
  forwardingUrl: string;
  status: "active" | "disabled";
}

export interface PageRulesViewProps {
  selectedZoneName: string;
  isLoading: boolean;
  editingPageRuleId: string | null;
  pageRules: PageRule[];
  newPageRule: PageRuleFormState;
  onBack: () => void;
  onFormChange: (form: PageRuleFormState) => void;
  onResetForm: () => void;
  onSubmit: () => void;
  onRefresh: () => void;
  onToggleRule: (ruleId: string, checked: boolean) => void;
  onEditRule: (ruleId: string) => void;
  onDeleteRule: (ruleId: string) => void;
}
