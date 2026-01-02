import { app, ipcMain } from 'electron'
import { logger } from './logger.js'

const REF_API_BASE = 'https://edencom.net/api/v1'
const EVE3D_API_KEY = process.env['EVE3D_API_KEY'] || ''
const REF_MAX_RETRIES = 3
const REF_RETRY_BASE_DELAY_MS = 2000
const REF_MIN_REQUEST_INTERVAL_MS = 250
const REF_REQUEST_TIMEOUT_MS = 60000

let refGlobalRetryAfter = 0
let refLastRequestTime = 0
let cachedHeaders: Record<string, string> | null = null

function makeUserAgent(version: string): string {
  return `EVE3DUniverse/${version} (eve3duniverse@edencom.net)`
}

function getRefHeaders(): Record<string, string> {
  if (!cachedHeaders) {
    cachedHeaders = {
      'User-Agent': makeUserAgent(app.getVersion()),
      ...(EVE3D_API_KEY && { 'X-App-Key': EVE3D_API_KEY }),
    }
  }
  return cachedHeaders
}

function setRefGlobalBackoff(delayMs: number): void {
  const retryAt = Date.now() + delayMs
  if (retryAt > refGlobalRetryAfter) {
    refGlobalRetryAfter = retryAt
    logger.warn('Ref API global backoff set', {
      module: 'RefAPI',
      delayMs,
      retryAt,
    })
  }
}

async function waitForRefRateLimit(): Promise<void> {
  let now = Date.now()

  if (refGlobalRetryAfter > now) {
    await new Promise((r) => setTimeout(r, refGlobalRetryAfter - now))
    now = Date.now()
  }

  const timeSinceLastRequest = now - refLastRequestTime
  if (timeSinceLastRequest < REF_MIN_REQUEST_INTERVAL_MS) {
    await new Promise((r) =>
      setTimeout(r, REF_MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest)
    )
  }

  refLastRequestTime = Date.now()
}

async function fetchRefWithRetry(
  url: string,
  options: RequestInit
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= REF_MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      REF_REQUEST_TIMEOUT_MS
    )

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (response.status === 429) {
        const retryAfterHeader = response.headers.get('Retry-After')
        const retryAfterMs = retryAfterHeader
          ? parseInt(retryAfterHeader, 10) * 1000
          : REF_RETRY_BASE_DELAY_MS * Math.pow(2, attempt)

        setRefGlobalBackoff(retryAfterMs)

        if (attempt < REF_MAX_RETRIES) {
          logger.warn('Ref API rate limited, retrying', {
            module: 'RefAPI',
            attempt: attempt + 1,
            delay: retryAfterMs,
          })
          await new Promise((r) => setTimeout(r, retryAfterMs))
          continue
        }
      }
      return response
    } catch (err) {
      clearTimeout(timeoutId)
      if (err instanceof Error && err.name === 'AbortError') {
        lastError = new Error('Request timeout')
      } else {
        lastError = err instanceof Error ? err : new Error(String(err))
      }
      if (attempt < REF_MAX_RETRIES) {
        const delay = REF_RETRY_BASE_DELAY_MS * Math.pow(2, attempt)
        logger.warn('Ref API request failed, retrying', {
          module: 'RefAPI',
          attempt: attempt + 1,
          delay,
          reason: lastError.message,
        })
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }

  throw lastError ?? new Error('Ref API request failed after retries')
}

type RefResult<T> = T | { error: string }

async function refGet<T>(
  endpoint: string,
  channel: string
): Promise<RefResult<T>> {
  await waitForRefRateLimit()
  try {
    const response = await fetchRefWithRetry(`${REF_API_BASE}${endpoint}`, {
      headers: getRefHeaders(),
    })
    if (!response.ok) {
      return { error: `HTTP ${response.status}` }
    }
    return await response.json()
  } catch (err) {
    logger.error(`${channel} fetch failed`, err, { module: 'RefAPI' })
    return { error: String(err) }
  }
}

export function registerRefAPIHandlers(): void {
  ipcMain.handle('ref:systems-3d', () =>
    refGet('/reference/systems-3d', 'ref:systems-3d')
  )

  ipcMain.handle('ref:stargates', () =>
    refGet('/reference/stargates', 'ref:stargates')
  )
}
