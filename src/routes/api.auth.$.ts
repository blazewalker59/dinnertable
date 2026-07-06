import { createFileRoute } from '@tanstack/react-router'
import { createAuth } from '../lib/auth'

// Catch-all that mounts Better Auth's handler at /api/auth/* (ADR-0014).
export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => createAuth().handler(request),
      POST: ({ request }) => createAuth().handler(request),
    },
  },
})
