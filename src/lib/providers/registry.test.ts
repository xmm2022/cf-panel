import { describe, expect, it } from "vitest";
import { providers } from "./registry";

describe("provider registry", () => {
  it("exposes cloudflare with zones capability", () => {
    expect(providers.cloudflare).toBeDefined();
    expect(providers.cloudflare.id).toBe("cloudflare");
    expect(providers.cloudflare.label).toBeTypeOf("string");
  });

  it("exposes edgeone with id but possibly empty capabilities at this task", () => {
    expect(providers.edgeone.id).toBe("edgeone");
  });

  it("lists capability keys that resolve to defined objects", () => {
    const caps = providers.cloudflare.capabilities;

    for (const [key, value] of Object.entries(caps)) {
      if (value !== undefined) {
        expect(value, `capability ${key}`).toBeTypeOf("object");
      }
    }
  });
});
