/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `mock` = login demo sin Supabase; `supabase` = auth real si hay VITE_SUPABASE_* */
  readonly VITE_AUTH_MODE?: 'mock' | 'supabase'
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_ENABLE_OPERATIONS_MOCK_AUTH?: 'true' | 'false'
  readonly VITE_OPERATIONS_MOCK_EMAIL?: string
  readonly VITE_OPERATIONS_MOCK_PASSWORD?: string
  readonly VITE_OPERATIONS_MOCK_NAME?: string
  readonly VITE_CORPORATE_MOCK_EMAIL?: string
  readonly VITE_CORPORATE_MOCK_PASSWORD?: string
  readonly VITE_CORPORATE_MOCK_NAME?: string
  readonly VITE_TECHNICIAN_MOCK_EMAIL?: string
  readonly VITE_TECHNICIAN_MOCK_PASSWORD?: string
  readonly VITE_TECHNICIAN_MOCK_NAME?: string
  /** Mock login rol cliente (residencial) cuando VITE_ENABLE_OPERATIONS_MOCK_AUTH=true */
  readonly VITE_CLIENT_MOCK_EMAIL?: string
  readonly VITE_CLIENT_MOCK_PASSWORD?: string
  readonly VITE_CLIENT_MOCK_NAME?: string
  /** Base URL del mock-hub o FastAPI (p. ej. http://127.0.0.1:4010). Si falta, se usan mocks locales. */
  readonly VITE_STATS_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
