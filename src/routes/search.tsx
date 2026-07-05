import { Link, createFileRoute } from '@tanstack/react-router'
import { searchRecipes } from '../server/recipes'

export const Route = createFileRoute('/search')({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === 'string' ? search.q : '',
  }),
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: ({ deps }) => searchRecipes({ data: deps.q }),
  component: SearchPage,
})

function SearchPage() {
  const { query, results } = Route.useLoaderData()
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-8 font-display text-3xl font-semibold tracking-tight">
        {query ? `Search: “${query}”` : 'Search'}
      </h1>
      {results.length === 0 ? (
        <p className="text-ink-soft">
          {query ? 'No recipes match.' : 'Type something in the search box above.'}
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-card">
          {results.map((r) => (
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
