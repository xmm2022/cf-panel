import type { ProviderCredentials, ProviderId } from "./providers/types";

const ACCOUNTS_KEY = "cf_accounts";
const CURRENT_ACCOUNT_KEY = "cf_current_account_id";
const SCHEMA_VERSION_KEY = "cf_accounts_schema_version";
const SCHEMA_VERSION = "2";

export interface Account {
  id: string;
  provider: ProviderId;
  label: string;
  credentials: ProviderCredentials;
  addedAt: number;
}

// Compatibility shape for the current Cloudflare-only UI. The serialized v2
// schema does not include these fields; they are attached as non-enumerable
// getters for legacy call sites that still read account.email/apiKey/nickname.
export interface CloudflareAccount extends Account {
  email: string;
  apiKey: string;
  nickname?: string;
}

interface LegacyAccount {
  id: string;
  email: string;
  apiKey: string;
  nickname?: string;
  addedAt: number;
}

export interface SaveAccountInput {
  provider: ProviderId;
  label: string;
  credentials: ProviderCredentials;
}

function generateAccountId(): string {
  return `acc_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function isAccount(item: LegacyAccount | Account): item is Account {
  return "provider" in item && "credentials" in item;
}

function migrateAccount(item: LegacyAccount | Account): Account {
  if (isAccount(item)) {
    return item;
  }

  return {
    id: item.id,
    provider: "cloudflare",
    label: item.nickname ?? item.email,
    credentials: {
      provider: "cloudflare",
      email: item.email,
      apiKey: item.apiKey,
    },
    addedAt: item.addedAt,
  };
}

function parseStoredAccounts(): Account[] {
  try {
    const raw = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "[]") as Array<
      LegacyAccount | Account
    >;
    return raw.map(migrateAccount);
  } catch (error) {
    console.error("Failed to load accounts:", error);
    return [];
  }
}

function withCompatibility(account: Account): CloudflareAccount {
  if (account.provider !== "cloudflare") {
    return account as CloudflareAccount;
  }

  const compatible = { ...account } as CloudflareAccount;
  Object.defineProperties(compatible, {
    email: {
      enumerable: false,
      get: () =>
        account.credentials.provider === "cloudflare"
          ? account.credentials.email
          : "",
    },
    apiKey: {
      enumerable: false,
      get: () =>
        account.credentials.provider === "cloudflare"
          ? account.credentials.apiKey
          : "",
    },
    nickname: {
      enumerable: false,
      get: () =>
        account.credentials.provider === "cloudflare" &&
        account.label !== account.credentials.email
          ? account.label
          : undefined,
    },
  });

  return compatible;
}

function persistAccounts(accounts: Account[]): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function runMigrations(): void {
  if (localStorage.getItem(SCHEMA_VERSION_KEY) === SCHEMA_VERSION) {
    return;
  }

  const migrated = parseStoredAccounts();
  persistAccounts(migrated);
  localStorage.setItem(SCHEMA_VERSION_KEY, SCHEMA_VERSION);
}

/**
 * 获取所有保存的账号
 */
export function getAllAccounts(): CloudflareAccount[] {
  runMigrations();
  return parseStoredAccounts().map(withCompatibility);
}

/**
 * 获取当前选中的账号ID
 */
export function getCurrentAccountId(): string | null {
  return localStorage.getItem(CURRENT_ACCOUNT_KEY);
}

/**
 * 获取当前账号
 */
export function getCurrentAccount(): CloudflareAccount | null {
  const currentId = getCurrentAccountId();
  if (!currentId) {
    return null;
  }

  return getAllAccounts().find((account) => account.id === currentId) ?? null;
}

function normalizeSaveInput(
  inputOrEmail: SaveAccountInput | string,
  apiKey?: string,
  nickname?: string,
): SaveAccountInput {
  if (typeof inputOrEmail !== "string") {
    return inputOrEmail;
  }

  return {
    provider: "cloudflare",
    label: nickname ?? inputOrEmail,
    credentials: {
      provider: "cloudflare",
      email: inputOrEmail,
      apiKey: apiKey ?? "",
    },
  };
}

function matchesAccount(account: Account, input: SaveAccountInput): boolean {
  if (
    account.provider === "cloudflare" &&
    input.credentials.provider === "cloudflare" &&
    account.credentials.provider === "cloudflare"
  ) {
    return account.credentials.email === input.credentials.email;
  }

  return account.provider === input.provider && account.label === input.label;
}

/**
 * 添加或更新账号
 */
export function saveAccount(input: SaveAccountInput): CloudflareAccount;
export function saveAccount(
  email: string,
  apiKey: string,
  nickname?: string,
): CloudflareAccount;
export function saveAccount(
  inputOrEmail: SaveAccountInput | string,
  apiKey?: string,
  nickname?: string,
): CloudflareAccount {
  const input = normalizeSaveInput(inputOrEmail, apiKey, nickname);
  const accounts = parseStoredAccounts();
  const existing = accounts.find((account) => matchesAccount(account, input));

  const account: Account = existing
    ? {
        ...existing,
        label: input.label,
        credentials: input.credentials,
      }
    : {
        id: generateAccountId(),
        provider: input.provider,
        label: input.label,
        credentials: input.credentials,
        addedAt: Date.now(),
      };

  const nextAccounts = existing
    ? accounts.map((item) => (item.id === account.id ? account : item))
    : [...accounts, account];

  persistAccounts(nextAccounts);
  localStorage.setItem(SCHEMA_VERSION_KEY, SCHEMA_VERSION);
  return withCompatibility(account);
}

/**
 * 设置当前账号
 */
export function setCurrentAccount(accountId: string): boolean {
  const account = getAllAccounts().find((item) => item.id === accountId);
  if (!account) {
    return false;
  }

  localStorage.setItem(CURRENT_ACCOUNT_KEY, accountId);
  return true;
}

/**
 * 删除账号
 */
export function deleteAccount(accountId: string): boolean {
  const accounts = parseStoredAccounts();
  const nextAccounts = accounts.filter((account) => account.id !== accountId);

  if (nextAccounts.length === accounts.length) {
    return false;
  }

  persistAccounts(nextAccounts);

  if (getCurrentAccountId() === accountId) {
    localStorage.removeItem(CURRENT_ACCOUNT_KEY);
  }

  return true;
}

/**
 * 清除所有账号（用于完全重置）
 */
export function clearAllAccounts(): void {
  localStorage.removeItem(ACCOUNTS_KEY);
  localStorage.removeItem(CURRENT_ACCOUNT_KEY);
  localStorage.removeItem(SCHEMA_VERSION_KEY);
}
