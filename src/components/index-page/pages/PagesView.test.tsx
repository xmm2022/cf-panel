import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PagesView } from "./PagesView";
import type { PagesDeploymentSummary, PagesProjectSummary } from "./pages-types";

const projects: PagesProjectSummary[] = [
  {
    id: "project-1",
    name: "docs-site",
    subdomain: "docs-site.pages.dev",
    created_on: "2026-05-20T00:00:00.000Z",
  },
];

const deployments: PagesDeploymentSummary[] = [
  {
    id: "deployment-1",
    environment: "production",
    created_on: "2026-05-20T00:00:00.000Z",
  },
];

describe("PagesView", () => {
  it("renders projects and requests deployment history", async () => {
    const user = userEvent.setup();
    const onOpenDeployments = vi.fn();

    render(
      <PagesView
        pagesProjects={projects}
        pagesDeployments={deployments}
        selectedPagesProject=""
        showPagesDeployments={false}
        isLoadingPages={false}
        zonesReady={true}
        onRefresh={vi.fn()}
        onCreateProject={vi.fn()}
        onOpenDashboard={vi.fn()}
        onOpenProjectDashboard={vi.fn()}
        onOpenDeployments={onOpenDeployments}
        onCloseDeployments={vi.fn()}
        onRetryDeployment={vi.fn()}
        onCopyText={vi.fn()}
      />,
    );

    expect(screen.getByText("docs-site")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /部署/i }));
    expect(onOpenDeployments).toHaveBeenCalledWith("docs-site");
  });

  it("shows empty state placeholder when no projects exist", () => {
    render(
      <PagesView
        pagesProjects={[]}
        pagesDeployments={[]}
        selectedPagesProject=""
        showPagesDeployments={false}
        isLoadingPages={false}
        zonesReady={true}
        onRefresh={vi.fn()}
        onCreateProject={vi.fn()}
        onOpenDashboard={vi.fn()}
        onOpenProjectDashboard={vi.fn()}
        onOpenDeployments={vi.fn()}
        onCloseDeployments={vi.fn()}
        onRetryDeployment={vi.fn()}
        onCopyText={vi.fn()}
      />,
    );

    expect(screen.getByText("暂无 Pages 项目")).toBeInTheDocument();
    expect(screen.getByText("您还没有创建任何 Pages 项目")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /前往 Dashboard 创建项目/i })).toBeInTheDocument();
  });

  it("shows loading state while pages projects are being fetched", () => {
    render(
      <PagesView
        pagesProjects={[]}
        pagesDeployments={[]}
        selectedPagesProject=""
        showPagesDeployments={false}
        isLoadingPages
        zonesReady={true}
        onRefresh={vi.fn()}
        onCreateProject={vi.fn()}
        onOpenDashboard={vi.fn()}
        onOpenProjectDashboard={vi.fn()}
        onOpenDeployments={vi.fn()}
        onCloseDeployments={vi.fn()}
        onRetryDeployment={vi.fn()}
        onCopyText={vi.fn()}
      />,
    );

    expect(screen.getByText("正在加载 Pages 项目...")).toBeInTheDocument();
  });

  it("disables refresh and create when zones are not ready", () => {
    render(
      <PagesView
        pagesProjects={projects}
        pagesDeployments={[]}
        selectedPagesProject=""
        showPagesDeployments={false}
        isLoadingPages={false}
        zonesReady={false}
        onRefresh={vi.fn()}
        onCreateProject={vi.fn()}
        onOpenDashboard={vi.fn()}
        onOpenProjectDashboard={vi.fn()}
        onOpenDeployments={vi.fn()}
        onCloseDeployments={vi.fn()}
        onRetryDeployment={vi.fn()}
        onCopyText={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /刷新/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /新建项目/i })).toBeDisabled();
  });

  it("renders deployments panel with retry control when shown", async () => {
    const user = userEvent.setup();
    const onRetryDeployment = vi.fn();
    const onCloseDeployments = vi.fn();

    render(
      <PagesView
        pagesProjects={projects}
        pagesDeployments={deployments}
        selectedPagesProject="docs-site"
        showPagesDeployments={true}
        isLoadingPages={false}
        zonesReady={true}
        onRefresh={vi.fn()}
        onCreateProject={vi.fn()}
        onOpenDashboard={vi.fn()}
        onOpenProjectDashboard={vi.fn()}
        onOpenDeployments={vi.fn()}
        onCloseDeployments={onCloseDeployments}
        onRetryDeployment={onRetryDeployment}
        onCopyText={vi.fn()}
      />,
    );

    expect(screen.getByText("部署历史 - docs-site")).toBeInTheDocument();
    expect(screen.getByText("查看项目的所有部署记录")).toBeInTheDocument();
    const buttons = screen.getAllByRole("button");
    const retryButton = buttons.find((b) => b.querySelector("svg.lucide-play"));
    expect(retryButton).toBeDefined();
    await user.click(retryButton!);
    expect(onRetryDeployment).toHaveBeenCalledWith("deployment-1");
  });

  it("copies subdomain URL through the onCopyText callback", async () => {
    const user = userEvent.setup();
    const onCopyText = vi.fn();

    render(
      <PagesView
        pagesProjects={projects}
        pagesDeployments={[]}
        selectedPagesProject=""
        showPagesDeployments={false}
        isLoadingPages={false}
        zonesReady={true}
        onRefresh={vi.fn()}
        onCreateProject={vi.fn()}
        onOpenDashboard={vi.fn()}
        onOpenProjectDashboard={vi.fn()}
        onOpenDeployments={vi.fn()}
        onCloseDeployments={vi.fn()}
        onRetryDeployment={vi.fn()}
        onCopyText={onCopyText}
      />,
    );

    const buttons = screen.getAllByRole("button");
    const copyButton = buttons.find((b) => b.querySelector("svg.lucide-copy"));
    expect(copyButton).toBeDefined();
    await user.click(copyButton!);
    expect(onCopyText).toHaveBeenCalledWith("https://docs-site.pages.dev", "URL 已复制");
  });
});
