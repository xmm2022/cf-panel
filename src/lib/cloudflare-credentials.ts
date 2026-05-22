/**
 * Cloudflare 凭据管理
 * 使用 cookie 存储，有效期30天
 */

import { getCookie, deleteCookie } from './cookies';

const CF_EMAIL_KEY = 'cf_email';
const CF_API_KEY = 'cf_api_key';

export const getCloudflareCredentials = (): { email: string | null; apiKey: string | null } => {
  return {
    email: getCookie(CF_EMAIL_KEY),
    apiKey: getCookie(CF_API_KEY)
  };
};

export const clearCloudflareCredentials = () => {
  deleteCookie(CF_EMAIL_KEY);
  deleteCookie(CF_API_KEY);
};
