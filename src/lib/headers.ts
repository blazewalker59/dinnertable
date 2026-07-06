// TanStack's getRequestHeaders() may hand back a Headers instance or a plain
// record (with possibly-array values) depending on runtime. The session
// resolver normalizes through here so the coercion quirks live once.
export function normalizeHeaders(
  raw: Headers | Record<string, unknown> | null | undefined,
): Headers {
  const headers = new Headers()
  const entries =
    raw instanceof Headers ? [...raw.entries()] : Object.entries(raw ?? {})
  for (const [key, value] of entries) {
    if (value == null) continue
    if (Array.isArray(value)) {
      for (const v of value) if (v != null) headers.append(key, String(v))
    } else {
      headers.set(key, String(value))
    }
  }
  return headers
}
