/**
 * Minimal fetch wrapper for the FastAPI backend.
 *  - Bearer token from the session store (wired via `configureApiAuth`).
 *  - Errors become `ApiError` with the backend's stable `code`.
 *  - Network failures / 502–504 are retried only when the request is safe to repeat
 *    (GET, or a POST carrying an Idempotency-Key).
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

interface AuthHooks {
  getToken(): string | null
  onUnauthorized(): void
}

let hooks: AuthHooks = { getToken: () => null, onUnauthorized: () => {} }

export function configureApiAuth(h: AuthHooks) {
  hooks = h
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT'
  body?: unknown
  query?: Record<string, string | string[] | undefined>
  idempotencyKey?: string
  /** Login itself must not trigger the global sign-out on 401. */
  skipAuthHandling?: boolean
}

const RETRY_DELAYS = [400, 1200]
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function createApiClient(baseUrl: string) {
  const base = baseUrl.replace(/\/$/, '')

  return async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const method = opts.method ?? 'GET'
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(opts.query ?? {})) {
      if (v === undefined) continue
      for (const item of Array.isArray(v) ? v : [v]) params.append(k, item)
    }
    const qs = params.toString()
    const url = `${base}${path}${qs ? `?${qs}` : ''}`
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
    const token = hooks.getToken()
    if (token) headers.Authorization = `Bearer ${token}`
    if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey

    const retryable = method === 'GET' || !!opts.idempotencyKey
    for (let attempt = 0; ; attempt++) {
      let res: Response
      try {
        res = await fetch(url, {
          method,
          headers,
          body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        })
      } catch {
        if (retryable && attempt < RETRY_DELAYS.length) {
          await sleep(RETRY_DELAYS[attempt])
          continue
        }
        throw new ApiError(0, 'network', 'Server unreachable')
      }
      if ([502, 503, 504].includes(res.status) && retryable && attempt < RETRY_DELAYS.length) {
        await sleep(RETRY_DELAYS[attempt])
        continue
      }
      if (res.ok) return (await res.json()) as T

      let code = `http_${res.status}`
      let message = res.statusText || `HTTP ${res.status}`
      try {
        const data = await res.json()
        const d = data?.detail
        if (d && typeof d === 'object' && 'code' in d) {
          code = String(d.code)
          message = String(d.message ?? message)
        } else if (typeof d === 'string') {
          message = d
        } else if (Array.isArray(d)) {
          code = 'validation'
          message = d.map((x: { msg?: string }) => x.msg).join('; ')
        }
      } catch {
        /* non-JSON error body */
      }
      if (res.status === 401 && !opts.skipAuthHandling) hooks.onUnauthorized()
      if (res.status === 401 && code === 'http_401') code = 'unauthorized'
      if (res.status === 403 && code === 'http_403') code = 'forbidden'
      throw new ApiError(res.status, code, message)
    }
  }
}

export type ApiRequest = ReturnType<typeof createApiClient>
