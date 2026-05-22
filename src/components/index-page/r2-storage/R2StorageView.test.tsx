import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { R2StorageView } from "./R2StorageView";

describe("R2StorageView", () => {
  it("renders bucket names", () => {
    render(
      <R2StorageView
        buckets={[{ name: "assets", creation_date: "2026-05-20" }]}
        selectedBucket=""
        files={[]}
        error={null}
        isLoading={false}
        isLoadingFiles={false}
        isUploading={false}
        showS3Config={false}
        accountId="account-1"
        onSelectBucket={vi.fn()}
        onShowS3Config={vi.fn()}
        onCloseS3Config={vi.fn()}
        onRefreshBuckets={vi.fn()}
        onRefreshFiles={vi.fn()}
        onUploadFile={vi.fn()}
        onDeleteBucket={vi.fn()}
        onOpenExamples={vi.fn()}
        onCopy={vi.fn()}
      />,
    );

    expect(screen.getByText("assets")).toBeInTheDocument();
  });
});
