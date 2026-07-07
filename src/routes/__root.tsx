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
    links: [{ rel: 'stylesheet', href: appCss }],
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
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <Sprig className="h-5 w-10" />
            <span className="font-display text-xl font-semibold tracking-tight">
              dinnertable
            </span>
          </Link>
          <div className="flex items-center gap-4">
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
              className="text-sm font-semibold text-leaf-deep hover:text-ink"
            >
              {me.displayName}
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
