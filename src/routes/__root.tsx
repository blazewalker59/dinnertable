import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
  redirect,
} from '@tanstack/react-router'
import { RouteProgress } from '../components/PageStates'
import { SearchBox } from '../components/SearchBox'
import { Sprig } from '../components/Sprig'
import { getMe } from '../server/members'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    const me = await getMe()
    if (!me && location.pathname !== '/login')
      throw redirect({ to: '/login' })
    return { me }
  },
  loader: ({ context }) => ({ me: context.me }),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      { title: 'dinnertable' },
      // Matches the solid header (bg-card), which the status bar sits over.
      { name: 'theme-color', content: '#ffffff' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        // Not black-translucent: iOS blurs anything drawn under a
        // translucent status bar in the Home Screen app.
        content: 'default',
      },
      { name: 'apple-mobile-web-app-title', content: 'dinnertable' },
      { name: 'mobile-web-app-capable', content: 'yes' },
    ],
    links: [
      // Fonts as <link>s, not a CSS @import, so they don't block the
      // stylesheet (faster cold start of the Home Screen app).
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..600&family=Nunito+Sans:opsz,wght@6..12,400;6..12,600;6..12,700&display=swap',
      },
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: '/logo192.png' },
      { rel: 'manifest', href: '/manifest.json' },
    ],
  }),
  shellComponent: RootDocument,
  component: RootLayout,
})

function RootLayout() {
  const { me } = Route.useLoaderData()
  if (!me) return <Outlet />
  return (
    <>
      {/* Solid and pinned to the top: on iOS (26+) the installed app draws
          under the status bar and blurs whatever scrolls there. A solid
          element pinned at the top is what keeps that area crisp. */}
      <header className="sticky top-0 z-30 border-b border-line bg-card pt-[env(safe-area-inset-top)]">
        <div className="relative mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <Link to="/" className="flex min-h-11 shrink-0 items-center gap-2">
            <Sprig className="h-4 w-8 sm:h-5 sm:w-10" />
            <span className="font-display text-xl font-semibold tracking-tight">
              dinnertable
            </span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <SearchBox />
            <Link
              to="/favorites"
              aria-label="My favorites"
              className="icon-btn text-xl text-petal-accent hover:bg-petal/40"
            >
              ♥
            </Link>
            <Link
              to="/profile"
              aria-label="Your profile"
              className="link min-w-11 justify-center sm:px-2"
            >
              <span className="hidden sm:inline">{me.displayName}</span>
              <svg
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden
                className="h-5 w-5 sm:hidden"
              >
                <circle cx="10" cy="6.5" r="3.2" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="M3.5 17c1-3.2 3.5-4.5 6.5-4.5s5.5 1.3 6.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </Link>
          </div>
        </div>
      </header>
      <RouteProgress />
      <Outlet />
    </>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
