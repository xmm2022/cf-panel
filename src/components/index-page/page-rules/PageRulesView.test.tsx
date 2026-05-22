import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createEmptyPageRuleForm } from "./page-rule-form";
import { PageRulesView } from "./PageRulesView";

describe("PageRulesView", () => {
  it("renders page rules and triggers edit", async () => {
    const onEditRule = vi.fn();
    const user = userEvent.setup();

    render(
      <PageRulesView
        selectedZoneName="example.com"
        isLoading={false}
        editingPageRuleId={null}
        pageRules={[
          {
            id: "rule-1",
            zoneId: "zone-1",
            status: "active",
            priority: 1,
            rawTargets: [{ constraint: { value: "*.example.com/*" } }],
            rawActions: [{ id: "cache_level", value: "cache_everything" }],
          },
        ]}
        newPageRule={createEmptyPageRuleForm()}
        onBack={vi.fn()}
        onFormChange={vi.fn()}
        onResetForm={vi.fn()}
        onSubmit={vi.fn()}
        onRefresh={vi.fn()}
        onToggleRule={vi.fn()}
        onEditRule={onEditRule}
        onDeleteRule={vi.fn()}
      />,
    );

    expect(screen.getByText("*.example.com/*")).toBeInTheDocument();
    expect(screen.getByText(/cache level: cache_everything/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /编辑/i }));
    expect(onEditRule).toHaveBeenCalledWith("rule-1");
  });
});
