// ── SECURE LOGGING ─────────────────────────────────────
// Prevent accidentally logging sensitive data

const SENSITIVE_FIELDS = [
  'password',
  'token',
  'otp',
  'code',
  'jwt',
  'jwt_secret',
  'secret',
  'api_key',
  'apikey',
  'authorization',
  'cookie',
  'session',
  'hash',
  'otpcode',
  'magic_link',
  'magiclink',
  'reset_token',
  'verification_code',
  'database_url',
  'db_url',
  'connection_string',
]

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase()
  return SENSITIVE_FIELDS.some((field) => lower.includes(field))
}

function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (typeof value === 'string') {
    // Show only first 2 chars + asterisks for tokens
    if (value.length > 4) {
      return `${value.slice(0, 2)}${'*'.repeat(Math.min(value.length - 2, 8))}`
    }
    return '***'
  }
  if (typeof value === 'object') {
    return sanitize(value as Record<string, unknown>)
  }
  return '***'
}

export function sanitize<T>(data: T): T {
  if (data === null || data === undefined) return data
  if (typeof data !== 'object') return data

  if (Array.isArray(data)) {
    return data.map((item) => sanitize(item)) as unknown as T
  }

  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      sanitized[key] = sanitizeValue(value)
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitize(value as Record<string, unknown>)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized as T
}

export function safeLog(label: string, data?: unknown): void {
  if (process.env.NODE_ENV === 'production') {
    // In production, only log in safe format
    if (data) {
      console.log(`[${label}]`, JSON.stringify(sanitize(data)))
    } else {
      console.log(`[${label}]`)
    }
  } else {
    // In development, full logging
    if (data) {
      console.log(`[${label}]`, data)
    } else {
      console.log(`[${label}]`)
    }
  }
}

export function safeError(label: string, error: unknown): void {
  const errorInfo = {
    name: error instanceof Error ? error.name : 'Unknown',
    message: error instanceof Error ? error.message : String(error),
    stack: process.env.NODE_ENV === 'production' ? undefined : error instanceof Error ? error.stack : undefined,
  }
  console.error(`[${label}]`, errorInfo)
}
