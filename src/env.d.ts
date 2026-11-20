interface ImportMetaEnv {
  /** "demo" (in-browser, default) or "api" (FastAPI backend) */
  readonly VITE_DATA_SOURCE?: 'demo' | 'api'
  /** API base URL, default "/api/v1" (proxied to the backend by Vite / nginx) */
  readonly VITE_API_URL?: string
}
