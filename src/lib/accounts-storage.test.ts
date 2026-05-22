import { beforeEach, describe, expect, it } from "vitest";
import {
  getAllAccounts,
  getCurrentAccount,
  runMigrations,
  saveAccount,
  setCurrentAccount,
} from "./accounts-storage";

describe("accounts-storage v2", () => {
  beforeEach(() => localStorage.clear());

  it("migrates legacy schema (no version) into v2 with cloudflare provider", () => {
    localStorage.setItem(
      "cf_accounts",
      JSON.stringify([
        {
          id: "acc_1",
          email: "u@e.com",
          apiKey: "k1",
          nickname: "main",
          addedAt: 1,
        },
      ]),
    );

    runMigrations();

    const accounts = getAllAccounts();
    expect(accounts).toEqual([
      {
        id: "acc_1",
        provider: "cloudflare",
        label: "main",
        credentials: {
          provider: "cloudflare",
          email: "u@e.com",
          apiKey: "k1",
        },
        addedAt: 1,
      },
    ]);
    expect(localStorage.getItem("cf_accounts_schema_version")).toBe("2");
  });

  it("saves and retrieves an edgeone account", () => {
    runMigrations();

    const account = saveAccount({
      provider: "edgeone",
      label: "personal",
      credentials: { provider: "edgeone", secretId: "AKID", secretKey: "k" },
    });
    setCurrentAccount(account.id);

    expect(getCurrentAccount()).toEqual(account);
  });
});
