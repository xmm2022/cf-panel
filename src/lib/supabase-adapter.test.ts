import { afterEach, describe, expect, it, vi } from "vitest";
import { supabase } from "./supabase-adapter";

describe("supabase adapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("invokes non-provider worker endpoints through /api/<function>", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, result: [] }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await supabase.functions.invoke("operation-history", {
      body: { action: "list" },
    });

    expect(response).toEqual({
      data: { success: true, result: [] },
      error: null,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/operation-history"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ action: "list" }),
      }),
    );
  });

  it("returns an Error when the worker endpoint rejects the request", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "nope" }), {
        status: 500,
        statusText: "Internal Server Error",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await supabase.functions.invoke("operation-history");

    expect(response.data).toBeNull();
    expect(response.error).toEqual(new Error("nope"));
  });
});
