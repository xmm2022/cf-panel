import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CreatePagesProjectDialog } from "./CreatePagesProjectDialog";

describe("CreatePagesProjectDialog", () => {
  it("renders both deployment method options and Wrangler CLI hint when open", () => {
    render(
      <CreatePagesProjectDialog open={true} onOpenChange={vi.fn()} onSelectMethod={vi.fn()} />,
    );

    expect(screen.getByText("创建 Pages 项目")).toBeInTheDocument();
    expect(screen.getByText("上传文件部署")).toBeInTheDocument();
    expect(screen.getByText("连接 Git 仓库")).toBeInTheDocument();
    expect(screen.getByText("使用 Wrangler CLI 部署")).toBeInTheDocument();
    expect(screen.getByText("Dashboard 拖拽上传整个文件夹")).toBeInTheDocument();
    expect(screen.getByText("代码提交自动触发部署")).toBeInTheDocument();
  });

  it("emits upload method when upload card is clicked", async () => {
    const user = userEvent.setup();
    const onSelectMethod = vi.fn();

    render(
      <CreatePagesProjectDialog
        open={true}
        onOpenChange={vi.fn()}
        onSelectMethod={onSelectMethod}
      />,
    );

    await user.click(screen.getByText("上传文件部署"));
    expect(onSelectMethod).toHaveBeenCalledWith("upload");
  });

  it("emits git method when git card is clicked", async () => {
    const user = userEvent.setup();
    const onSelectMethod = vi.fn();

    render(
      <CreatePagesProjectDialog
        open={true}
        onOpenChange={vi.fn()}
        onSelectMethod={onSelectMethod}
      />,
    );

    await user.click(screen.getByText("连接 Git 仓库"));
    expect(onSelectMethod).toHaveBeenCalledWith("git");
  });
});
