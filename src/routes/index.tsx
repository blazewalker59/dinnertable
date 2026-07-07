import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ManageSections } from '../components/ManageSections'
import { Sprig } from '../components/Sprig'
import { listSections, recentRecipes } from '../server/recipes'

export const Route = createFileRoute('/')({
  loader: async () => {
    const [sectionList, recent] = await Promise.all([
      listSections(),
      recentRecipes(),
    ])
    return { sectionList, recent }
  },
  component: Home,
})

function Home() {
  const { sectionList, recent } = Route.useLoaderData()
  const [managing, setManaging] = useState(false)
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Recently added
        </h1>
        <Link
          to="/recipes/new"
          className="rounded-lg bg-leaf-deep px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink"
        >
          Add a recipe
        </Link>
      </div>
      {recent.length === 0 ? (
        <p className="text-ink-soft">No recipes yet — add the first one.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
          {recent.map((r) => (
            <li key={r.id}>
              <Link
                to="/recipes/$recipeId"
                params={{ recipeId: String(r.id) }}
                className="flex items-center gap-4 px-4 py-3 transition hover:bg-cream"
              >
                {r.imageId ? (
                  <img
                    src={`/img/${r.imageId}/thumb`}
                    alt=""
                    loading="lazy"
                    className="h-14 w-14 shrink-0 rounded-xl border border-line object-cover"
                  />
                ) : (
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-line bg-cream">
                    <Sprig className="h-5 w-10" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{r.title}</span>
                  <span className="block truncate text-sm text-ink-soft">
                    {r.attribution ? `${r.attribution} · ` : ''}
                    added by {r.addedBy}
                  </span>
                </span>
                <span className="shrink-0 text-sm text-leaf-deep">
                  {r.sectionName}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-10 mb-4 font-display text-2xl font-semibold tracking-tight">
        Sections
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {sectionList.map((s) => (
          <li key={s.id}>
            <Link
              to="/sections/$sectionId"
              params={{ sectionId: String(s.id) }}
              className="block rounded-2xl border border-line bg-card px-6 py-6 shadow-sm transition hover:border-leaf hover:shadow"
            >
              <div className="font-display text-xl font-semibold">{s.name}</div>
              <div className="mt-1 text-sm text-ink-soft">
                {s.recipeCount} {s.recipeCount === 1 ? 'recipe' : 'recipes'}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-8 text-center">
        <button
          onClick={() => setManaging((m) => !m)}
          className="text-sm text-ink-soft hover:text-leaf-deep"
        >
          {managing ? 'Done editing sections' : 'Edit sections'}
        </button>
        {managing && <ManageSections sections={sectionList} />}
      </div>
    </main>
  )
}
