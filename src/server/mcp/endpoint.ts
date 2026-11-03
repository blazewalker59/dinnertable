/**
 * `/mcp`: dinnertable's MCP server for agents (ADR-0015). Each request
 * carries a member's API token as `Authorization: Bearer dt_…`; one
 * JSON-RPC message per POST, answered with JSON. Server-only.
 */

import { handleMcp, parseError, requestError } from './protocol'
import { REQUESTS_PER_MINUTE, bearerToken, verifyToken } from './tokens'
import { ADD_INSTRUCTIONS, INSTRUCTIONS, dinnertableTools } from './tools'

// Room for up to four base64 screenshots in one add_recipe_from_image call.
const MAX_BODY_BYTES = 40 * 1024 * 1024

function report(error: unknown, context: Record<string, unknown>) {
  console.error('mcp', context, error)
  return Promise.resolve()
}

export async function serveMcp(request: Request): Promise<Response> {
  // No server-to-client stream: every reply comes back on its POST.
  if (request.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: { allow: 'POST' },
    })
  }
  const origin = new URL(request.url).origin
  // Agents call from servers; a browser page on another site never may.
  const from = request.headers.get('origin')
  if (from && from !== origin) {
    return new Response('Forbidden', { status: 403 })
  }

  const token = bearerToken(request.headers.get('authorization'))
  const caller = token ? await verifyToken(token) : null
  if (!caller) {
    return new Response('A dinnertable API token is required', {
      status: 401,
      headers: { 'www-authenticate': 'Bearer realm="dinnertable"' },
    })
  }
  if (caller.retryAfter > 0) {
    return Response.json(
      requestError(
        `Too many requests: at most ${REQUESTS_PER_MINUTE} a minute per token. Try again in ${caller.retryAfter} seconds.`,
      ),
      { status: 429, headers: { 'retry-after': String(caller.retryAfter) } },
    )
  }

  const declared = Number(request.headers.get('content-length'))
  if (declared > MAX_BODY_BYTES) {
    return new Response('Request too large', { status: 413 })
  }
  const text = await request.text()
  if (text.length > MAX_BODY_BYTES) {
    return new Response('Request too large', { status: 413 })
  }
  let message: unknown
  try {
    message = JSON.parse(text)
  } catch {
    return Response.json(parseError, { status: 400 })
  }

  try {
    const reply = await handleMcp(
      message,
      dinnertableTools(caller, origin),
      caller.scopes.includes('add')
        ? `${INSTRUCTIONS} ${ADD_INSTRUCTIONS}`
        : INSTRUCTIONS,
      (tool, error) => report(error, { memberId: caller.memberId, tool }),
    )
    return reply === null
      ? new Response(null, { status: 202 })
      : Response.json(reply)
  } catch (error) {
    await report(error, { memberId: caller.memberId })
    return new Response('Internal error', { status: 500 })
  }
}
