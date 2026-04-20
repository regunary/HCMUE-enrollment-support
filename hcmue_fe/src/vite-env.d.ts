/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for Django API, no trailing slash (e.g. http://localhost:8000) */
  readonly VITE_API_BASE_URL?: string
  /** When true, use in-memory mock; when false, call VITE_API_BASE_URL */
  readonly VITE_USE_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
