import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
  redirect,
} from '@tanstack/react-router'
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
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'dinnertable' },
    ],
    links: [
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
      <header className="border-b border-line bg-card/70">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <Sprig className="hidden h-5 w-10 sm:block" />
            <span className="font-display text-xl font-semibold tracking-tight">
              dinnertable
            </span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <SearchBox />
            <Link
              to="/favorites"
              aria-label="My favorites"
              className="text-lg text-petal-deep hover:text-ink"
            >
              ♥
            </Link>
            <Link
              to="/profile"
              aria-label="Your profile"
              className="text-sm font-semibold text-leaf-deep hover:text-ink"
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
