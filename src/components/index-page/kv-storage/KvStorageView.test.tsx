import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { KvStorageView } from "./KvStorageView";
import type { KvStorageViewProps } from "./kv-storage-types";
import type { KVKeySummary, KVNamespaceSummary } from "@/components/index-page/shared/index-page-types";

const namespaces: KVNamespaceSummary[] = [
  { id: "ns-1", title: "main" },
  { id: "ns-2", title: "cache" },
];

const keys: KVKeySummary[] = [{ name: "alpha" }, { name: "beta" }];

const baseProps: KvStorageViewProps = {
  kvNamespaces: [],
  selectedKvNamespace: "",
  kvKeys: [],
  selectedKvKeys: [],
  isLoading: false,
  onCreateNamespace: vi.fn(),
  onRefreshNamespaces: vi.fn(),
  onDeleteNamespace: vi.fn(),
  onNamespaceChange: vi.fn(),
  onSaveKeyValue: vi.fn(),
  onReadValue: vi.fn(),
  onDeleteKey: vi.fn(),
  onExportKeys: vi.fn(),
  onImportKeys: vi.fn(),
  onLoadKeys: vi.fn(),
  onDeleteSelectedKeys: vi.fn(),
  onToggleKeySelection: vi.fn(),
};

describe("KvStorageView", () => {
  it("renders the section title and description", () => {
    render(<KvStorageView {...baseProps} />);
    expect(screen.getByText("Workers KV 管理")).toBeInTheDocument();
    expect(screen.getByText("管理 Workers KV 命名空间和键值对")).toBeInTheDocument();
  });

  it("shows the empty namespace placeholder when list is empty", () => {
    render(<KvStorageView {...baseProps} />);
    expect(screen.getByText("暂无命名空间数据，点击上方创建或刷新列表")).toBeInTheDocument();
  });

  it("shows the loading label on the create button while loading", () => {
    render(<KvStorageView {...baseProps} isLoading />);
    expect(screen.getByText("创建中...")).toBeInTheDocument();
    expect(screen.getByText("加载中...")).toBeInTheDocument();
  });

  it("invokes onCreateNamespace with the namespace name from the input", async () => {
    const user = userEvent.setup();
    const onCreateNamespace = vi.fn();
    render(<KvStorageView {...baseProps} onCreateNamespace={onCreateNamespace} />);

    const nameInput = document.getElementById("kv-namespace-name") as HTMLInputElement;
    expect(nameInput).toBeTruthy();
    await user.type(nameInput, "fresh-ns");

    await user.click(screen.getByRole("button", { name: "创建命名空间" }));
    expect(onCreateNamespace).toHaveBeenCalledWith("fresh-ns");
  });

  it("calls onRefreshNamespaces when refresh button clicked", async () => {
    const user = userEvent.setup();
    const onRefreshNamespaces = vi.fn();
    render(<KvStorageView {...baseProps} onRefreshNamespaces={onRefreshNamespaces} />);

    await user.click(screen.getByRole("button", { name: "刷新列表" }));
    expect(onRefreshNamespaces).toHaveBeenCalledTimes(1);
  });

  it("renders namespaces with delete buttons", async () => {
    const user = userEvent.setup();
    const onDeleteNamespace = vi.fn();
    render(
      <KvStorageView {...baseProps} kvNamespaces={namespaces} onDeleteNamespace={onDeleteNamespace} />,
    );

    expect(screen.getByText("main")).toBeInTheDocument();
    expect(screen.getByText("cache")).toBeInTheDocument();
    expect(screen.getByText("ID: ns-1")).toBeInTheDocument();

    const buttons = screen.getAllByRole("button");
    const trashButtons = buttons.filter((b) => b.querySelector("svg.lucide-trash2"));
    expect(trashButtons.length).toBe(2);
    await user.click(trashButtons[0]);
    expect(onDeleteNamespace).toHaveBeenCalledWith(namespaces[0]);
  });

  it("requests onLoadKeys when 加载键列表 is clicked", async () => {
    const user = userEvent.setup();
    const onLoadKeys = vi.fn();
    render(<KvStorageView {...baseProps} onLoadKeys={onLoadKeys} />);

    await user.click(screen.getByRole("button", { name: "加载键列表" }));
    expect(onLoadKeys).toHaveBeenCalledTimes(1);
  });

  it("shows the namespace placeholder text when there are no namespaces", () => {
    render(<KvStorageView {...baseProps} />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.options[0].text).toBe("请先加载命名空间列表");
  });

  it("changes namespace placeholder when namespaces exist", () => {
    render(<KvStorageView {...baseProps} kvNamespaces={namespaces} />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.options[0].text).toBe("请选择命名空间");
  });

  it("invokes onNamespaceChange when selecting from the dropdown", async () => {
    const user = userEvent.setup();
    const onNamespaceChange = vi.fn();
    render(
      <KvStorageView
        {...baseProps}
        kvNamespaces={namespaces}
        onNamespaceChange={onNamespaceChange}
      />,
    );
    await user.selectOptions(screen.getByRole("combobox"), "ns-2");
    expect(onNamespaceChange).toHaveBeenCalledWith("ns-2");
  });

  it("shows placeholder when no namespace is selected", () => {
    render(<KvStorageView {...baseProps} kvNamespaces={namespaces} />);
    expect(screen.getByText("选择命名空间后加载键列表")).toBeInTheDocument();
  });

  it("shows empty-key placeholder when namespace selected but no keys", () => {
    render(
      <KvStorageView
        {...baseProps}
        kvNamespaces={namespaces}
        selectedKvNamespace="ns-1"
      />,
    );
    expect(screen.getByText("暂无键，点击“加载键列表”获取")).toBeInTheDocument();
  });

  it("renders keys and toggles selection via the checkbox", async () => {
    const user = userEvent.setup();
    const onToggleKeySelection = vi.fn();
    render(
      <KvStorageView
        {...baseProps}
        kvNamespaces={namespaces}
        selectedKvNamespace="ns-1"
        kvKeys={keys}
        onToggleKeySelection={onToggleKeySelection}
      />,
    );

    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(screen.getByText("beta")).toBeInTheDocument();

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]);
    expect(onToggleKeySelection).toHaveBeenCalledWith("alpha", true);
  });

  it("disables 批量删除 until selectedKvKeys is non-empty", () => {
    const { rerender } = render(
      <KvStorageView
        {...baseProps}
        kvNamespaces={namespaces}
        selectedKvNamespace="ns-1"
        kvKeys={keys}
      />,
    );
    expect(screen.getByRole("button", { name: "批量删除" })).toBeDisabled();

    rerender(
      <KvStorageView
        {...baseProps}
        kvNamespaces={namespaces}
        selectedKvNamespace="ns-1"
        kvKeys={keys}
        selectedKvKeys={["alpha"]}
      />,
    );
    expect(screen.getByRole("button", { name: "批量删除" })).toBeEnabled();
  });

  it("invokes save / read / delete key handlers with current input values", async () => {
    const user = userEvent.setup();
    const onSaveKeyValue = vi.fn();
    const onReadValue = vi.fn();
    const onDeleteKey = vi.fn();
    render(
      <KvStorageView
        {...baseProps}
        kvNamespaces={namespaces}
        selectedKvNamespace="ns-1"
        onSaveKeyValue={onSaveKeyValue}
        onReadValue={onReadValue}
        onDeleteKey={onDeleteKey}
      />,
    );

    await user.click(screen.getByRole("button", { name: "保存键值对" }));
    expect(onSaveKeyValue).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "读取值" }));
    expect(onReadValue).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "删除键" }));
    expect(onDeleteKey).toHaveBeenCalledTimes(1);
  });

  it("triggers export and delegates import to onImportKeys when a file is chosen", async () => {
    const onExportKeys = vi.fn();
    const onImportKeys = vi.fn();
    const user = userEvent.setup();
    render(
      <KvStorageView
        {...baseProps}
        kvNamespaces={namespaces}
        selectedKvNamespace="ns-1"
        onExportKeys={onExportKeys}
        onImportKeys={onImportKeys}
      />,
    );

    await user.click(screen.getByRole("button", { name: /导出为 JSON/ }));
    expect(onExportKeys).toHaveBeenCalledTimes(1);

    const file = new File(['[{"key":"k","value":"v"}]'], "kv.json", { type: "application/json" });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    await user.upload(fileInput, file);
    expect(onImportKeys).toHaveBeenCalledWith(file);
  });
});
