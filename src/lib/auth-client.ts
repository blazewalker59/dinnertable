import { createAuthClient } from 'better-auth/react'

// Same-origin: the auth API is mounted at /api/auth on this app.
export const authClient = createAuthClient()
