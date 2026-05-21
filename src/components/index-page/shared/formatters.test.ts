import { describe, expect, it } from "vitest";
import { formatGigabytes, formatMetricNumber, formatPercent } from "./formatters";

describe("shared formatters", () => {
  it("formats metric numbers with zh-CN separators", () => {
    expect(formatMetricNumber(1234567)).toBe("1,234,567");
  });

  it("formats bytes as gigabytes", () => {
    expect(formatGigabytes(1073741824)).toBe("1.00 GB");
  });

  it("formats percentages with zero-division protection", () => {
    expect(formatPercent(25, 100)).toBe("25.0%");
    expect(formatPercent(1, 0)).toBe("0%");
  });
});
