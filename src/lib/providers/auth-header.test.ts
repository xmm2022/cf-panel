import { describe, expect, it } from "vitest";
import { encodeProviderAuth, parseProviderAuth } from "./auth-header";
import type { ProviderCredentials } from "./types";

describe("provider auth header", () => {
  it("round-trips cloudflare credentials", () => {
    const creds: ProviderCredentials = {
      provider: "cloudflare",
      email: "u@example.com",
      apiKey: "abc 123;x=y",
    };

    const header = encodeProviderAuth(creds);

    expect(header).toMatch(/^cloudflare /);
    expect(parseProviderAuth(header)).toEqual(creds);
  });

  it("round-trips edgeone credentials", () => {
    const creds: ProviderCredentials = {
      provider: "edgeone",
      secretId: "AKID;0",
      secretKey: "k=v",
    };

    const header = encodeProviderAuth(creds);

    expect(parseProviderAuth(header)).toEqual(creds);
  });

  it("rejects unknown provider tokens", () => {
    expect(() => parseProviderAuth("mystery key=value")).toThrow(/unknown provider/i);
  });

  it("rejects malformed segments", () => {
    expect(() => parseProviderAuth("cloudflare email")).toThrow(/malformed/i);
  });
});
