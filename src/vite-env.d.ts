/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MFE_BACKEND_URL: string
  readonly VITE_MFE_PROJECT_ID: string
  /** Optional: omit it and the backend resolves the environment from the domain. */
  readonly VITE_MFE_ENVIRONMENT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
