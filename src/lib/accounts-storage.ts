// 多账号管理系统

export interface CloudflareAccount {
  id: string;
  email: string;
  apiKey: string;
  nickname?: string;
  addedAt: number;
}

const ACCOUNTS_KEY = 'cf_accounts';
const CURRENT_ACCOUNT_KEY = 'cf_current_account_id';

/**
 * 获取所有保存的账号
 */
export function getAllAccounts(): CloudflareAccount[] {
  try {
    const accountsJson = localStorage.getItem(ACCOUNTS_KEY);
    if (!accountsJson) return [];
    return JSON.parse(accountsJson);
  } catch (error) {
    console.error('Failed to load accounts:', error);
    return [];
  }
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
  if (!currentId) return null;
  
  const accounts = getAllAccounts();
  return accounts.find(acc => acc.id === currentId) || null;
}

/**
 * 添加或更新账号
 */
export function saveAccount(email: string, apiKey: string, nickname?: string): CloudflareAccount {
  const accounts = getAllAccounts();
  
  // 检查是否已存在相同邮箱的账号
  const existingIndex = accounts.findIndex(acc => acc.email === email);
  
  const account: CloudflareAccount = {
    id: existingIndex >= 0 ? accounts[existingIndex].id : generateAccountId(),
    email,
    apiKey,
    nickname,
    addedAt: existingIndex >= 0 ? accounts[existingIndex].addedAt : Date.now()
  };
  
  if (existingIndex >= 0) {
    // 更新现有账号
    accounts[existingIndex] = account;
  } else {
    // 添加新账号
    accounts.push(account);
  }
  
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  return account;
}

/**
 * 设置当前账号
 */
export function setCurrentAccount(accountId: string): boolean {
  const accounts = getAllAccounts();
  const account = accounts.find(acc => acc.id === accountId);
  
  if (!account) return false;
  
  localStorage.setItem(CURRENT_ACCOUNT_KEY, accountId);
  return true;
}

/**
 * 删除账号
 */
export function deleteAccount(accountId: string): boolean {
  const accounts = getAllAccounts();
  const filteredAccounts = accounts.filter(acc => acc.id !== accountId);
  
  if (filteredAccounts.length === accounts.length) {
    return false; // 账号不存在
  }
  
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(filteredAccounts));
  
  // 如果删除的是当前账号，清除当前账号标记
  if (getCurrentAccountId() === accountId) {
    localStorage.removeItem(CURRENT_ACCOUNT_KEY);
  }
  
  return true;
}

/**
 * 生成账号ID
 */
function generateAccountId(): string {
  return `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 清除所有账号（用于完全重置）
 */
export function clearAllAccounts(): void {
  localStorage.removeItem(ACCOUNTS_KEY);
  localStorage.removeItem(CURRENT_ACCOUNT_KEY);
}
