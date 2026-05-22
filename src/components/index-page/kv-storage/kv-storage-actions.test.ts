import { describe, expect, it } from "vitest";
import { buildKvExportFileName, parseKvImportJson } from "./kv-storage-actions";

describe("parseKvImportJson", () => {
  it("returns normalized KV entries", () => {
    const result = parseKvImportJson('[{"key":"token","value":"123"}]');
    expect(result).toEqual([{ key: "token", value: "123" }]);
  });

  it("coerces non-string values to strings", () => {
    const result = parseKvImportJson('[{"key":"count","value":42},{"key":"flag","value":true}]');
    expect(result).toEqual([
      { key: "count", value: "42" },
      { key: "flag", value: "true" },
    ]);
  });

  it("defaults missing value to empty string", () => {
    const result = parseKvImportJson('[{"key":"only-key"}]');
    expect(result).toEqual([{ key: "only-key", value: "" }]);
  });

  it("skips entries without a string key", () => {
    const result = parseKvImportJson('[{"key":"keep","value":"yes"},{"value":"no-key"},{"key":1,"value":"bad"}]');
    expect(result).toEqual([{ key: "keep", value: "yes" }]);
  });

  it("throws on non-array payloads", () => {
    expect(() => parseKvImportJson('{"key":"a"}')).toThrow(/数组/);
  });

  it("propagates JSON parse errors", () => {
    expect(() => parseKvImportJson("{not json")).toThrow();
  });
});

describe("buildKvExportFileName", () => {
  it("derives the export filename from the namespace id", () => {
    expect(buildKvExportFileName("ns-abc")).toBe("kv-export-ns-abc.json");
  });
});
