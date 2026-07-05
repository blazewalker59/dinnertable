import { Link, createFileRoute } from '@tanstack/react-router'
import { myFavorites } from '../server/favorites'

export const Route = createFileRoute('/favorites')({
  loader: () => myFavorites(),
  component: FavoritesPage,
})

function FavoritesPage() {
  const favoritesList = Route.useLoaderData()
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-8 font-display text-3xl font-semibold tracking-tight">
        My favorites
      </h1>
      {favoritesList.length === 0 ? (
        <p className="text-ink-soft">
          No favorites yet — tap the ♡ on any recipe.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-card">
          {favoritesList.map((r) => (
            <li key={r.id}>
              <Link
                to="/recipes/$recipeId"
                params={{ recipeId: String(r.id) }}
                className="flex items-baseline justify-between gap-4 px-6 py-4 transition hover:bg-cream"
              >
                <span>
                  <span className="font-semibold">{r.title}</span>
                  {r.attribution && (
                    <span className="ml-2 text-sm text-ink-soft">
                      {r.attribution}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-sm text-leaf-deep">
                  {r.sectionName}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
