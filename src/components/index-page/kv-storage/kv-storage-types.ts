import type { KVKeySummary, KVNamespaceSummary } from "@/components/index-page/shared/index-page-types";

export interface KvImportEntry {
  key: string;
  value: string;
}

export interface KvStorageViewProps {
  kvNamespaces: KVNamespaceSummary[];
  selectedKvNamespace: string;
  kvKeys: KVKeySummary[];
  selectedKvKeys: string[];
  isLoading: boolean;
  onCreateNamespace: (name: string) => void;
  onRefreshNamespaces: () => void;
  onDeleteNamespace: (namespace: KVNamespaceSummary) => void;
  onNamespaceChange: (namespaceId: string) => void;
  onSaveKeyValue: () => void;
  onReadValue: () => void;
  onDeleteKey: () => void;
  onExportKeys: () => void;
  onImportKeys: (file: File) => void;
  onLoadKeys: () => void;
  onDeleteSelectedKeys: () => void;
  onToggleKeySelection: (keyName: string, checked: boolean) => void;
}
