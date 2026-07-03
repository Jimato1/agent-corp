/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLIENT_SERVER_THRESHOLD_MB?: string;
  readonly VITE_API_TARGET?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
