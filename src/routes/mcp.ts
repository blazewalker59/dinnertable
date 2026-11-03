import { createFileRoute } from '@tanstack/react-router'
import { serveMcp } from '../server/mcp/endpoint'

// Agents sign in with an API token, not a session (ADR-0015).
export const Route = createFileRoute('/mcp')({
  server: {
    handlers: {
      GET: ({ request }) => serveMcp(request),
      POST: ({ request }) => serveMcp(request),
    },
  },
})
