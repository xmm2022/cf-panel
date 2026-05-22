import { describe, expect, it } from "vitest";
import { createEmptyPageRuleForm, mapRuleToForm } from "./page-rule-form";
import type { PageRule } from "@/lib/providers/types";

describe("page-rule-form", () => {
  it("maps a forwarding rule into editable form state", () => {
    const rule: PageRule = {
      id: "rule-1",
      zoneId: "zone-1",
      status: "active",
      rawActions: [
        {
          id: "forwarding_url",
          value: { status_code: 301, url: "https://example.com" },
        },
      ],
      rawTargets: [{ constraint: { value: "*.example.com/*" } }],
    };

    expect(mapRuleToForm(rule)).toMatchObject({
      urlPattern: "*.example.com/*",
      forwardingType: "301",
      forwardingUrl: "https://example.com",
    });
    expect(createEmptyPageRuleForm().status).toBe("active");
  });
});
