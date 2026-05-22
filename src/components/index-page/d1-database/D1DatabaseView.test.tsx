import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { D1DatabaseView } from "./D1DatabaseView";

describe("D1DatabaseView", () => {
  it("renders database names", () => {
    render(
      <D1DatabaseView
        databases={[{ uuid: "db-1", name: "main", created_at: "2026-05-20" }]}
        selectedDatabase=""
        sqlQuery=""
        queryHistory={[]}
        historyIndex={-1}
        queryResult={null}
        isLoading={false}
        isExecutingQuery={false}
        canCreate
        onSelectDatabase={vi.fn()}
        onSqlQueryChange={vi.fn()}
        onHistoryIndexChange={vi.fn()}
        onRunQuery={vi.fn()}
        onRefresh={vi.fn()}
        onOpenCreateDialog={vi.fn()}
        onDeleteDatabase={vi.fn()}
      />,
    );

    expect(screen.getByText("main")).toBeInTheDocument();
  });
});
