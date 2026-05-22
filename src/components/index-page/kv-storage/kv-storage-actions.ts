import type { KvImportEntry } from "./kv-storage-types";

export const parseKvImportJson = (text: string): KvImportEntry[] => {
  const parsed = JSON.parse(text);

  if (!Array.isArray(parsed)) {
    throw new Error("格式错误，应为数组");
  }

  return parsed
    .filter((item): item is { key: string; value?: unknown } =>
      typeof (item as { key?: unknown })?.key === "string",
    )
    .map((item) => ({
      key: item.key,
      value: String(item.value ?? ""),
    }));
};

export const buildKvExportFileName = (namespaceId: string): string =>
  `kv-export-${namespaceId}.json`;
