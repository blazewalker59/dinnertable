import { createFileRoute } from '@tanstack/react-router'
import { currentMember } from '../server/auth'
import { getImageResponse } from '../server/images-store'

// Images are served through the app (same-origin, so the browser's Access
// session cookie authorizes <img> loads) rather than public URLs — family
// photos stay behind the login (ADR-0004, amended).
export const Route = createFileRoute('/img/$imageId/$size')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        await currentMember()
        return getImageResponse(params.imageId, params.size)
      },
    },
  },
})
