import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { ErrorPage, NotFoundPage } from './components/PageStates'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    // The installed app has no browser back button, so a failed or missing
    // page needs its own way home.
    defaultErrorComponent: ErrorPage,
    defaultNotFoundComponent: NotFoundPage,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
