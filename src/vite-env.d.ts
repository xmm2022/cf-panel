/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WORKER_API_URL?: string;
  readonly VITE_BASE_PATH?: string;
  readonly VITE_ADMIN_EMAILS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
