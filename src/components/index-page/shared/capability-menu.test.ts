import { describe, expect, it } from "vitest";
import { providers } from "@/lib/providers/registry";
import { buildSidebarItems } from "./capability-menu";

describe("buildSidebarItems", () => {
  it("returns 11 items for cloudflare", () => {
    const items = buildSidebarItems("cloudflare", providers);

    expect(items.map((item) => item.key)).toEqual([
      "zones",
      "dns",
      "page-rules",
      "workers",
      "kv",
      "certificates",
      "analytics",
      "pages",
      "r2",
      "d1",
      "tunnels",
    ]);
  });

  it("returns only capabilities edgeone has", () => {
    const items = buildSidebarItems("edgeone", providers);

    expect(items.some((item) => item.key === "pages")).toBe(false);
    expect(items.some((item) => item.key === "r2")).toBe(false);
  });
});
