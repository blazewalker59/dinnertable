import { Link, createFileRoute } from '@tanstack/react-router'
import { getSection } from '../server/recipes'

export const Route = createFileRoute('/sections/$sectionId')({
  loader: ({ params }) => getSection({ data: Number(params.sectionId) }),
  component: SectionPage,
})

function SectionPage() {
  const { section, recipes } = Route.useLoaderData()
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link to="/" className="text-sm text-leaf-deep hover:text-ink">
        ← All sections
      </Link>
      <h1 className="mt-3 mb-8 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {section.name}
      </h1>
      {recipes.length === 0 ? (
        <p className="text-ink-soft">Nothing here yet.</p>
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-card">
          {recipes.map((r) => (
            <li key={r.id}>
              <Link
                to="/recipes/$recipeId"
                params={{ recipeId: String(r.id) }}
                className="flex items-baseline justify-between gap-4 px-6 py-4 transition hover:bg-cream"
              >
                <span className="font-semibold">{r.title}</span>
                {r.attribution && (
                  <span className="shrink-0 text-sm text-ink-soft">
                    {r.attribution}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
